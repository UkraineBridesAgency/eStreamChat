var chatRoomId = -1; // The current chat room id
var activePanel; // The jquery object of the currently active tab
var eventsTimer; // The timer that check for new chat events
var userId; // Current user id
var token; // Authorization token
var lastTimestamp = 0; // The last received event timestamp
var onlineUsers = new Object(); // Contains the data for the online users; object used as hashtable
var initialEventLoad = true; // A flag that is set to false on the first successful event load
var kicked = false; // A flag that is set to true when the user is kicked or banned.
var isAdmin = false;
var alertEnabled = false;
var videoChatEnabled = false;
var fileTransferEnabled = false;
var flashMediaServer;
var webcamdetected = false;
var currentVideoBroadcastGuid = null;
var messengerMode = false;
var messengerTargetUserId = null;
var messengerIsInitiator = false;
var imUserCanSendMessages = false; // Prevents sending messages while the other IM user has not already joined the room
var broadcastVideoWidth = 750;
var broadcastVideoHeight = 600;
var broadcastVideoWindowWidth = 250;
var broadcastVideoWindowHeight = 200;
var receiveVideoWindowWidth = 750;
var receiveVideoWindowHeight = 600;
var uba = new Uba();

$(function () {
    if (typeof $('body').data('messengermode') == 'boolean')
        messengerMode = $('body').data('messengermode');

    if (messengerMode) {
        messengerTargetUserId = decodeURIComponent($.urlParam('target'));
        messengerIsInitiator = $.urlParam('init') == "1";
    }

    var templateUrl = $('#templates').data('url');
    $('#templates').load(templateUrl, function () {
        // Set css class based on the browser
        if ($.browser.msie) {
            $("body").addClass('msie');
            $("body").addClass('msie' + $.browser.version.substr(0, 1));
        }
        if ($.browser.webkit) $("body").addClass('webkit');
        if ($.browser.mozilla) $("body").addClass('mozilla');

        if ($.browser.msie && parseInt($.browser.version, 10) < 9) {
            $("label img").live("click", function () {
                $("#" + $(this).parents("label").attr("for")).focus();
                $("#" + $(this).parents("label").attr("for")).click();
            });
        }

        // Initialize color picker
        $('#textColor').colorPicker();

        $('#checkAlert').click(function () {
            alertEnabled = $('#checkAlert').is(':checked');
        });

        $('#checkVideoBroadcast').click(function () {
            var alreadyOpened;
            if (messengerMode)
                alreadyOpened = $('#divCurrentUserVideo').find('.broadcast-video').length;
            else
                alreadyOpened = $('#divBroadcastVideo').length != 0;
            broadcastVideo(!alreadyOpened);
        });

        $('#fileUploadDialogButton').bind('click', function () {
            $('#fileUploadDialog').dialog(
                {
                    close: function (ev, ui) {
                        focusMessageField();
                    }
                });
        });

        $("#fileUploadDialog #uploadButton").bind('click', function () {
            var toUserId = getTargetUserId();
            var sendFileURL = 'SendFile.ashx?token=' + token + "&chatRoomId=" + chatRoomId;
            if (toUserId != null)
                sendFileURL += "&toUserId=" + toUserId;

            $.ajaxFileUpload(
                {
                    url: sendFileURL,
                    secureuri: false,
                    fileElementId: 'fileUpload',
                    dataType: 'json',
                    success: function (data, status) {
                        $('#fileUploadDialog').dialog('close');
                        if (typeof (data.error) != 'undefined') {
                            if (data.error != '') {
                                alert(data.error);
                            } else {
                                var messagePanel = getPanelByUserId(toUserId);
                                messagePanel.append($('#fileSentTemplate').jqote());
                            }
                        }
                    },
                    error: function (data, status, e) {
                        alert(e);
                    }
                }
            );
        });

        // Set default jqote tag
        $.jqotetag('*');

        // Initialize jquery ui tabs & buttons
        $("#tabs").tabs({
            tabTemplate: '<li><a href="#{href}">#{label}</a> <span class="ui-icon ui-icon-close" style="cursor:pointer">Close Tab</span></li>',
            add: function (event, ui) {
                $('#' + ui.panel.id).addClass('messages');
                updateLayout();

                $(ui.tab).next('.ui-icon-close').attr('id', "close-" + ui.panel.id);
                $('#close-' + ui.panel.id).bind('click', function () {
                    var index = $('li', $("#tabs")).index($(this).parent());
                    $(this).parent().hide();
                    $("#tabs").tabs('remove', index);
                });
            },
            select: function (event, ui) {
                activePanel = $('#' + ui.panel.id);
                activePanel.parent().stopBlink();
            },
            show: function (event, ui) {
                activePanel = $('#' + ui.panel.id);
                scrollToBottom();
                focusMessageField();
            }
        });

        if (messengerMode) {
            $('#tabs ul li').hide();
        }

        // Set default active tab
        if (!messengerMode) {
            activePanel = $('#panel-room');
        } else {
            // replace non-alphanumeric characters in the userid
            $('#panel-room').attr('id', 'panel-' + messengerTargetUserId.replace(/[^\w]/g, '_'));
            activePanel = $('#panel-' + messengerTargetUserId.replace(/[^\w]/g, '_'));
        }

        // Prepare the text formatting buttons
        $("#formatButtons").buttonset();

        $('#checkAlert').button();
        $('#checkVideoBroadcast').button();

        //gives focus back to the message input field when a button is clicked
        $("#button-panel input, .color_picker_wrap, #color_selector, #button-panel select>option").each(function () { $(this).click(function () { focusMessageField(); }); });
        $("#button-panel select").each(function () {
            $(this).blur(function () { focusMessageField(); });
            $(this).change(function () { focusMessageField(); });
        });
        $('#button-panel select>option').each(function () { $(this).mousedown(function () { focusMessageField(); }); });

        // Update the layout
        updateLayout();
        $(window).resize(function () {
            updateLayout();
        });

        // Attach the send button handlers
        $("#sendButton").click(function () {
            sendMessageClicked();
            return false;
        });

        // Catch the enter button on the new message textbox
        $("#messageInput").keypress(function (event) {
            if (event.keyCode == 13) {
                event.preventDefault();
                sendMessageClicked();
                return false;
            }
        });

        // set up emoticons drop down
        createEmoticonList($('.emoticons-container'));
        var $emoticonSelect = $('.emoticons-container select')
        $emoticonSelect.msDropDown({ visibleRows: '12' });
        $('#emoticon-list_child').click(function () {
            $messageInput.val($messageInput.val() + $emoticonSelect.val());
        });

        // Get chat room id from parameter
        if (!messengerMode) {
            if ($.urlParam('roomId') != null)
                chatRoomId = $.urlParam('roomId');
        } else {
            //messenger room id is -2. All conversation inside the room should be private
            chatRoomId = -2;
        }

        // Configure alert popup for errors
        $.ajaxSetup({
            error: function (req, status, error) {
                if (console && console.log)
                    console.log(status + ' - ' + req.responseText);
            }
        });

        // Try to join the chat room
        $.ajax({
            type: "POST",
            url: "ChatEngine.svc/JoinChatRoom",
            data: '{"chatRoomId":"' + chatRoomId + '", "href":"' + window.location.href.replace(/'/g, "\'").replace(/\\/g, "\\\\") + '"}',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function (msg) {
                joinChatRoomSuccess(msg.d);
            }
        });
    });
});

function focusMessageField() {
    var msgField = $('#messageInput');
    var length = msgField.val().length;
    msgField.focus();
    msgField.setCursorPosition(length, length);
}

function playSound(url) {
    var browser = navigator.appName;
    if (browser == "Microsoft Internet Explorer") {
        document.all.sound.src = url;
    } else {
        $("#spanSound").html('<embed src="' + url + '" hidden="true" autostart="true" loop="false">');
    }
}

function getPrivateTabIndex(userId) {
    var index = $('li', $("#tabs")).index($('#close-panel-' + userId).parent());
    return index;
}

function joinChatRoomSuccess(result) {
    if (result.Error != null) {
        $.alert("Unable to join room!", result.Error);

        // Redirect to login url if requested
        if (result.RedirectUrl != null) {
            window.location.href = result.RedirectUrl;
        }
        return;
    }

    // Save user token
    token = result.Token;
    userId = result.userId;
    isAdmin = result.IsAdmin;
    fileTransferEnabled = result.FileTransferEnabled;
    videoChatEnabled = result.VideoChatEnabled;
    flashMediaServer = result.FlashMediaServer;

    // translate messages automatically
    if (result.CurrentUser.Gender == 2) {
        var $translateMessagesContainer = $('.translate-messages-container');
        $translateMessagesContainer.show();
        $translateMessagesContainer.find('.input').attr('checked', 'checked');
    }

    if (videoChatEnabled)
        $('#webcamdetector').append($('#webcamDetectorTemplate').jqote());

    (!videoChatEnabled || !webcamdetected) ? $("#videoBroadcastButtonContainer").hide() : $("#videoBroadcastButtonContainer").show();
    (!fileTransferEnabled) ? $("#fileUploadDialogButton").hide() : $("#fileUploadDialogButton").show();


    startEventsTimer();

    // Set window unload events
    $(window).bind('beforeunload', function() {
        return 'Do you really want to exit the chat?';
    });
    $(window).bind('unload', function() {
        if (!kicked) {
            $.ajax({
                type: "POST",
                url: "ChatEngine.svc/LeaveChatRoom",
                data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "messengerTargetUserId":'
                + (messengerMode ? '"' + messengerTargetUserId + '"' : 'null') + '}',
                contentType: "application/json; charset=utf-8",
                dataType: "json"
            });
        }
    });

    // Save the online users data
    for (var i = 0; i < result.Users.length; i++) {
        var user = result.Users[i];
        onlineUsers[user.Id] = user;
    }

    // Save broadcasts
    for (var i = 0; i < result.Broadcasts.length; i++) {
        if (onlineUsers[result.Broadcasts[i].Key] != undefined) {
            onlineUsers[result.Broadcasts[i].Key].Guid = result.Broadcasts[i].Value;
        }
    }

    // Prepare the online users list
    updateOnlineUsers();

    if (!messengerMode) {
        // Set chat room name to first tab
        $('#tabs ul li:first a').text(result.ChatRoomName);

        // Print initial messages
        outputSystemMessage("Connected!");
        outputSystemMessage(result.ChatRoomTopic);
    } else {
        // add messenger users
        uba.chatRoomId = chatRoomId;
        uba.userId = userId;
        uba.target = messengerTargetUserId;
        uba.token = token;

        if (messengerIsInitiator && location.hash != 'connected' /*onlineUsers[messengerTargetUserId] == undefined*/) {
            // check if the other user is already connected (perhaps the man refreshed the page?)
            if (onlineUsers[messengerTargetUserId] == null) {
            outputSystemMessage("Awaiting other user to accept the chat request...");
        } else {
                imUserCanSendMessages = true;

                // load this user's profile
                loadUserProfile(messengerTargetUserId);
            }

            // man has sent a request - show his current credits
            uba.StartCreditsRemainingPoll();
        } else {
            outputSystemMessage("Connected!");
            imUserCanSendMessages = true;
            location.hash = 'connected';

            // a lady has accepted a chat request
            uba.UserConnected();

            // load the user's profile
            loadUserProfile(messengerTargetUserId);
        }
    }
}

function loadUserProfile(userId) {
    var $memberProfile = $('.member-profile'), 
        template =
        '<div class="member-profile">' +
            '<p>' +
                '<strong>Username:</strong> ' + userId +
            '</p>' +
            '<p>' +
                '<strong>Name:</strong> ' + (!onlineUsers[userId].RealName ? '<em>Unspecified</em>' : onlineUsers[userId].RealName) +
            '</p>' +
            '<p>' +
                '<strong>Age:</strong> ' + (onlineUsers[userId].Age < 18 ? '<em>Unspecified</em>' : onlineUsers[userId].Age) +
            '</p>' +
            (onlineUsers[messengerTargetUserId].Gender == 1
            ? ('<p>' +
                '<strong>Country:</strong> ' + (!onlineUsers[userId].Country ? '<em>Unspecified</em>' : onlineUsers[userId].Country) +
            '</p>')
            : ('<p>' +
                '<strong>City:</strong> ' + (!onlineUsers[userId].City ? '<em>Unspecified</em>' : onlineUsers[userId].City) +
            '</p>')) +
            '<p class="last">' +
                '<strong>Occupation:</strong> ' + (!onlineUsers[userId].Occupation ? '<em>Unspecified</em>' : onlineUsers[userId].Occupation) +
            '</p>' +
        '</div>';

    if ($memberProfile.length) {
        $memberProfile.replaceWith(template);
    } else {
        $('#tabs-inner').prepend(template);
    }

    updateLayout();
}

function broadcastVideo(enable) {
    if (enable) {
        var targetUserId = getTargetUserId();
        $.ajax({
            type: "POST",
            url: "ChatEngine.svc/BroadcastVideo",
            data: '{"prevGuid":' + (currentVideoBroadcastGuid == null ? 'null' : '"' + currentVideoBroadcastGuid + '"') +
            ', "token":"' + token + '", "chatRoomId":"' + chatRoomId +
            '", "targetUserId":' + (targetUserId == null ? 'null' : '"' + targetUserId + '"') + '}',
            contentType: "application/json; charset=utf-8",
            dataType: "json",
            success: function(result) {
                currentVideoBroadcastGuid = result.d;
                var alreadyOpened;

                if (messengerMode) {
                    alreadyOpened = $('#divCurrentUserVideo').find('.broadcast-video').length;

                    if (!alreadyOpened) {
                        var videoWindow = $('#broadcastVideoWindowTemplate').jqote({ Guid: currentVideoBroadcastGuid, FlashMediaServer: flashMediaServer, BroadcastVideoWidth: broadcastVideoWidth, BroadcastVideoHeight: broadcastVideoHeight });
                        $('#divCurrentUserVideo').append(videoWindow);

                        $('#divCurrentUserVideo').css("background-image", "");
                        $('#divCurrentUserVideo').css("background-color", "white");

                        // show the video thing if they've hidden it already
                        if (!uba.isVideoBroadcastVisible()) {
                            $('.toggle-broadcast-video').click();
                        }

                        if (onlineUsers[userId] != undefined)
                            onlineUsers[userId].Guid = currentVideoBroadcastGuid;
                    }
                } else {
                    alreadyOpened = $('#divBroadcastVideo').length != 0;

                    if (!alreadyOpened) {
                        var videoWindow = $('#broadcastVideoWindowTemplate').jqote({ Guid: currentVideoBroadcastGuid, FlashMediaServer: flashMediaServer, BroadcastVideoWidth: broadcastVideoWidth, BroadcastVideoHeight: broadcastVideoHeight });
                        $('#videosPlaceholder').append(videoWindow);

                        $('#divBroadcastVideo').dialog({
                            modal: false,
                            autoOpen: true,
                            height: (broadcastVideoWindowHeight),
                            width: (broadcastVideoWindowWidth),
                            draggable: true,
                            resizable: true,
                            closeOnEscape: false,
                            close: function(ev, ui) {
                                broadcastVideo(false);
                                focusMessageField();
                            }
                        });

                        if (onlineUsers[userId] != undefined)
                            onlineUsers[userId].Guid = currentVideoBroadcastGuid;

                        $('#divBroadcastVideo').css({ 'top': '40px', 'left': '350px' });
                        var webcamIcon = $('#webcam' + userId);
                        webcamIcon.unbind('click');
                        webcamIcon.show();
                    }
                }

            }
        });
    } else {
        var alreadyOpened;

        if (messengerMode) {
            var $broadcastVideo = $('#divCurrentUserVideo').find('.broadcast-video');
            alreadyOpened = $broadcastVideo.length;
            if (alreadyOpened) {
                $broadcastVideo.remove();
            }
            $('#divCurrentUserVideo').css("background-image", "url(" + onlineUsers[userId].PhotoUrl + ")");
            $('#divCurrentUserVideo').css("background-color", "#F4EBE4");
        } else {
            alreadyOpened = $('#divBroadcastVideo').length != 0;

            if (alreadyOpened) {
                $('#divBroadcastVideo').dialog('destroy');
                $('#divBroadcastVideo').remove();
            }
        }

        if (alreadyOpened && currentVideoBroadcastGuid != null) {
            $.ajax({
                type: "POST",
                url: "ChatEngine.svc/StopVideoBroadcast",
                data: '{"token":"' + token + '", "chatRoomId":"' + chatRoomId + '"}',
                contentType: "application/json; charset=utf-8",
                dataType: "json"
            });

            var webcamIcon = $('#webcam' + userId);
            webcamIcon.unbind('click');
            webcamIcon.hide();

            if (onlineUsers[userId] != undefined)
                delete onlineUsers[userId].Guid;
        }

        currentVideoBroadcastGuid = null;
    }
}

function receiveVideo(senderUserId, guid) {
    if (messengerMode) {
        var alreadyOpened = !$('#divTargetUserVideo').is(':empty');

        if (!alreadyOpened) {
            var videoWindow = $('#receiveVideoWindowTemplate').jqote({ SenderUserId: senderUserId, Guid: guid, FlashMediaServer: flashMediaServer });
            $('#divTargetUserVideo').append(videoWindow);

            $('#divTargetUserVideo').css("background-image", "");
            $('#divTargetUserVideo').css("background-color", "white");
        }
    } else {
        var alreadyOpened = $('#divReceiveVideo' + senderUserId).length != 0;

        if (!alreadyOpened) {
            var videoWindow = $('#receiveVideoWindowTemplate').jqote({ SenderUserId: senderUserId, Guid: guid, FlashMediaServer: flashMediaServer });
            $('#videosPlaceholder').append(videoWindow);
            $('#divReceiveVideo' + senderUserId).dialog({
                modal: false,
                autoOpen: true,
                height: receiveVideoWindowHeight,
                width: receiveVideoWindowWidth,
                draggable: true,
                resizable: true,
                closeOnEscape: false,
                close: function(ev, ui) {
                    closeVideoReceiver(senderUserId);
                    focusMessageField();
                }
            });
            $('#divReceiveVideo' + senderUserId).css({ 'top': '40px', 'left': '550px' });
        }
    }
}

function closeVideoReceiver(senderUserId) {
    if (messengerMode) {
        if (onlineUsers[messengerTargetUserId] != undefined) {
            $('#divTargetUserVideo').empty();
            $('#divTargetUserVideo').css("background-image", "url(" + onlineUsers[messengerTargetUserId].PhotoUrl + ")");
            $('#divTargetUserVideo').css("background-color", "#F4EBE4");
        }
    } else {
        $('#divReceiveVideo' + senderUserId).dialog('destroy');
        $('#divReceiveVideo' + senderUserId).remove();
    }
}

function updateOnlineUsers() {
    if (messengerMode) {
        if (onlineUsers[userId] != undefined && onlineUsers[userId].Guid == undefined)
            $('#divCurrentUserVideo').css("background-image", "url(" + onlineUsers[userId].PhotoUrl + ")");
        if (onlineUsers[messengerTargetUserId] != undefined)
            $('#divTargetUserVideo').css("background-image", "url(" + onlineUsers[messengerTargetUserId].PhotoUrl + ")");
        return;
    }

    // Sort users
    var tempArray = new Array();
    i = 0;
    for (var key in onlineUsers) {
        tempArray[i] = onlineUsers[key].DisplayName + '||' + key;
        i++;
    }
    tempArray = tempArray.sort();
    var sortedUsers = new Array();
    for (i = 0; i < tempArray.length; i++) {
        var temp = tempArray[i].split('||');
        sortedUsers.push(onlineUsers[temp[1]]);
    }

    $('#onlineUsers').jqotesub('#onlineUserTemplate', sortedUsers);
    $("#onlineUsers .context-menu-target").contextMenu({
            menu: isAdmin ? 'adminMenu' : 'userMenu'
        }, function(action, el, pos) {
            var targetUserId = $(el).data("userId");
            var targetUserDisplayName = $(el).text();

            if (action == "private_chat") {
                $(el).click();
            } else if (action == "ignore_user") {
                $.ajax({
                    type: "POST",
                    url: "ChatEngine.svc/SendCommand",
                    data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "targetUserId":"' + targetUserId + '", "command":"ignore"}',
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(msg) {
                        outputSystemMessage("You have added " + targetUserDisplayName + " to your ignore list!", true);
                    }
                });
            } else if (action == "kick_user") {
                $.ajax({
                    type: "POST",
                    url: "ChatEngine.svc/SendCommand",
                    data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "targetUserId":"' + targetUserId + '", "command":"kick"}',
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(msg) {
                    }
                });
            } else if (action == "ban_user") {
                $.ajax({
                    type: "POST",
                    url: "ChatEngine.svc/SendCommand",
                    data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "targetUserId":"' + targetUserId + '", "command":"ban"}',
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(msg) {
                    }
                });
            } else if (action == "slap_user") {
                $.ajax({
                    type: "POST",
                    url: "ChatEngine.svc/SendCommand",
                    data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "targetUserId":"' + targetUserId + '", "command":"slap"}',
                    contentType: "application/json; charset=utf-8",
                    dataType: "json",
                    success: function(msg) {
                        outputSystemMessage("You slap " + targetUserDisplayName + " around with a large trout.", true);
                    }
                });
            } else {
                //the item is hyperlink (action == url) so we want to open it up
                //returning true will activate the hyperlink
                return true;
            }

            return false;
        }, //onshow menu
        function(jqSrcElement, jqMenu) {
            var userId = jqSrcElement.data("userId");
            var user = onlineUsers[userId];
            var a = jqMenu.find('LI.view-profile>A');
            if (!(user && user.ProfileUrl && user.ProfileUrl != "#")) {
                jqMenu.disableContextMenuItemsByClassName('view-profile');
                a.attr('href', 'javascript:void(0)');
                a.removeAttr('target');
            } else {
                jqMenu.enableContextMenuItemsByClassName('view-profile');
                a.attr('href', user.ProfileUrl);
                a.attr('target', '_blank');
            }
        });
}

function startEventsTimer() {
    eventsTimer = setInterval("getEvents()", 5000);
    getEvents();
}

function stopEventsTimer() {
    clearInterval(eventsTimer);
}

function getEvents() {
    // Try to join the chat room
    $.ajax({
        type: "POST",
        url: "ChatEngine.svc/GetEvents",
        data: '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "fromTimestamp":"' + lastTimestamp + '", "messengerTargetUserId":'
        + (messengerMode ? '"' + messengerTargetUserId + '"' : 'null') + '}',
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(msg) {
            getEventsSuccess(msg.d);
        }
    });
}

function getEventsSuccess(result) {
    if (result.Error != null) {
        $.alert("Error!", result.Error);
        return;
    }
    for (var i = 0; i < result.Messages.length; i++) {
        switch (result.Messages[i].MessageType) {
        case 1: // System message
            outputSystemMessage(result.Messages[i].Content);
            break;
        case 2: // User message
            if (initialEventLoad || result.Messages[i].FromUserId != userId) {
                outputUserMessage(result.Messages[i]);

                if (alertEnabled) {
                    if (isPrivateMessage(result.Messages[i]))
                        playSound('..\\PrivateMessage.wav');
                    else
                        playSound('..\\PublicMessage.wav');
                }
            }
            break;
        case 4: // User joined
            if (!initialEventLoad) {
                outputSystemMessage(result.Messages[i].Content);

                uba.UserConnected();

                imUserCanSendMessages = true;
            }
            break;
        case 5: // User left
            if (!initialEventLoad) {
                outputSystemMessage(result.Messages[i].Content);
                uba.UserDisconnected();
            }
            break;
        case 6: // Send file
        case 7: // Send image file
            outputUserMessage(result.Messages[i]);
            break;
        case 8: // User kicked or banned
            outputSystemMessage(result.Messages[i].Content);

            if (result.Messages[i].FromUserId == userId)
                closeChat();

            kicked = true;
            break;
        case 9: //video broadcast
            outputUserMessage(result.Messages[i]);
            break;
        case 10:
            if (!initialEventLoad) {
                if (onlineUsers[result.Messages[i].FromUserId] != undefined)
                    delete onlineUsers[result.Messages[i].FromUserId].Guid;
                $('#webcam' + result.Messages[i].FromUserId).hide();

                var alreadyOpened = $('#divReceiveVideo' + result.Messages[i].FromUserId).length != 0;
                if (alreadyOpened) {
                    closeVideoReceiver(result.Messages[i].FromUserId);
                }
            }
            break;
        case 12: //RequestAccepted = 12
            location.hash = 'connected';
            imUserCanSendMessages = true;
            break;
        case 13: //RequestDeclined = 13
            outputSystemMessage(result.Messages[i].Content);
            break;
        default:
            break;
        }

        if (result.Messages[i].Timestamp > lastTimestamp)
            lastTimestamp = result.Messages[i].Timestamp;
    }

    if (!initialEventLoad) {
        for (var i = 0; i < result.UsersJoined.length; i++) {
            var user = result.UsersJoined[i];
            onlineUsers[user.Id] = user;
            updateOnlineUsers();

            loadUserProfile(user.Id);
        }
        for (var i = 0; i < result.UsersLeft.length; i++) {
            var user = result.UsersLeft[i];
            delete onlineUsers[user.Id];
            updateOnlineUsers();
        }
    }

    initialEventLoad = false;

    if (result.CallInterval != null) {
        clearInterval(eventsTimer);
        eventsTimer = setInterval("getEvents()", result.CallInterval);
    }
}

function closeChat() {
    stopEventsTimer();
    disableInterface();
}

function disableInterface() {
    $('body').append('<div id="fade" style="z-index:99999999;background: #000;position: fixed; left: 0; top: 0;width: 100%; height: 100%;opacity: .60;"></div>');
    $('#fade').css({ 'filter': 'alpha(opacity=60)' }).fadeIn();
}

function outputSystemMessage(message, showInCurrentTab) {
    var panelId = showInCurrentTab == true || messengerMode ? activePanel.attr('id') : "panel-room";
    $('#' + panelId).append(
        $('#systemMessageTemplate').jqote({ Message: message })
    );

    scrollToBottom();
}

function isPrivateMessage(message) {
    return message.ToUserId != null;
}

function isPanelActive(messagePanel) {
    return messagePanel.attr('id') == activePanel.attr('id');
}

function formatOptionsToString(formatOptions) {
    var formatting = '';
    if (formatOptions != undefined) {
        if (formatOptions.Bold)
            formatting += "font-weight: bold;";
        if (formatOptions.Italic)
            formatting += "font-style: italic;";
        if (formatOptions.Underline)
            formatting += "text-decoration: underline;";
        if (formatOptions.Color != undefined && formatOptions.Color != '')
            formatting += "color: " + formatOptions.Color + ";";
        if (formatOptions.FontName != undefined && formatOptions.FontName != '')
            formatting += "font-family: " + formatOptions.FontName + ";";
        if (formatOptions.FontSize != undefined && formatOptions.FontSize != '')
            formatting += "font-size: " + formatOptions.FontSize + "px;";
    }

    return formatting;
}

function outputUserMessage(message) {
    var user = onlineUsers[message.FromUserId];
    if (user == undefined) return; // User left; do not print messages

    var messagePanel = getPanelForMessage(message);

    if (isPrivateMessage(message) && !isPanelActive(messagePanel)) {
        blinkPanelTab(messagePanel);
    }

    //if text message
    if (message.MessageType == 2) {
        var formatting = formatOptionsToString(message.FormatOptions),
            messageContent = message.Content;
        
        if (currentUser.Gender == 2 && userId != message.FromUserId) {
            translateMessage(messageContent, true, function (result) {
                if (typeof result == 'string' || result instanceof String) {
                    result = $.parseJSON(result);
                }

                if (result.data.translations.length > 0)
                    messageContent += ' [' + result.data.translations[0].translatedText + ']';
                
                renderUserMessage(messagePanel, user, messageContent, formatting);
            });
        } else {
            renderUserMessage(messagePanel, user, messageContent, formatting);
        }
    }
    
        //if generic file or image file
    else if (message.MessageType == 6 || message.MessageType == 7) {
        var templateId = message.MessageType == 6 ? "#incomingFileTemplate" : "#incomingImageTemplate";

        if (userId != message.FromUserId) {
            messagePanel.append($(templateId).jqote({ FileUrl: /*$.URLEncode(*/message.Content/*)*/, DisplayName: user.DisplayName }));
        }
    } else if (message.MessageType == 9) {
        if (userId != message.FromUserId) {
            messagePanel.append($('#incomingVideoTemplate').jqote({ DisplayName: user.DisplayName, SenderUserId: message.FromUserId, Guid: message.Content }));

            if (!initialEventLoad) {
                if (onlineUsers[message.FromUserId] != undefined)
                    onlineUsers[message.FromUserId].Guid = message.Content;
                //broadcasts[message.FromUserId] = message.Content;
                var webcamIcon = $('#webcam' + message.FromUserId);
                webcamIcon.unbind('click'/*, OnWebcamClick*/);
                webcamIcon.bind('click', { Guid: message.Content, SenderUserId: message.FromUserId }, OnWebcamClick);
                webcamIcon.show();
            }
        }
    }

    scrollToBottom();
}

function renderUserMessage(messagePanel, user, messageContent, formattingOptions) {
    messagePanel.append(
            $('#userMessageTemplate').jqote({
                ThumbnailUrl: user.ThumbnailUrl,
                DisplayName: user.DisplayName,
                Message: $(document).emoticon(filterMessage(messageContent)),
                FormatOptions: formattingOptions
            }));
}

function filterMessage(messageContent) {
    // filter email addresses
    var filteredMessage = messageContent.replace(/\b([^\s]+@[^\s]+)\b/g, '***********');
    filteredMessage = filteredMessage.replace(/^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/, '***********');
    filteredMessage = filteredMessage.replace(/\b(facebook|skype)\b/g, '***********');

    return filteredMessage;
}

function scrollToBottom() {
    activePanel.scrollTop(activePanel.prop("scrollHeight"));
}

function OnWebcamClick(event) {
    receiveVideo(event.data.SenderUserId, event.data.Guid);
}

function blinkPanelTab(messagePanel) {
    $('a[href$="#' + messagePanel.attr('id') + '"]').parent().blink();
}

function translateMessage(message, recipientIsLady, callback) {
    // translate the message
    $.ajax({
        type: 'GET',
        url: 'https://www.googleapis.com/language/translate/v2',
        data: {
            key: 'AIzaSyB_trkMDRsbag44cGKN2aw8Hf1SpGyvVfo',
            source: recipientIsLady ? 'en' : 'ru',
            target: recipientIsLady ? 'ru' : 'en',
            q: message
        },
        success: callback
    });
}

function sendMessageClicked() {
    if (messengerMode && !imUserCanSendMessages)
        return;

    var message = $('#messageInput').val();
    $('#messageInput').val('');
    if (message == '') return;

    if (currentUser.Gender == 2 && $('#translateMessages').is(':checked')) {
        translateMessage(message, false, function (result) {
            if (typeof result == 'string' || result instanceof String) {
                result = $.parseJSON(result);
            }

            if (result.data.translations.length > 0)
                message += ' [' + result.data.translations[0].translatedText + ']';

            sendMessage(message);
        });
    } else {
        sendMessage(message);
    }
}

function sendMessage(message) {
    var toUserId = getTargetUserId();

    // Get formatting options
    var isBold = $('#checkBold').is(':checked');
    var isItalic = $('#checkItalic').is(':checked');
    var isUnderline = $('#checkUnderline').is(':checked');
    var color = $('#textColor').val();
    var fontName = $('#dropFontName').val();
    var fontSize = $('#dropFontSize').val();

    // Print the user message instantly
    outputUserMessage({
        MessageType: 2,
        FromUserId: userId,
        Content: $.htmlEncode(message),
        ToUserId: toUserId,
        FormatOptions: { Bold: isBold, Italic: isItalic, Underline: isUnderline, Color: color, FontName: fontName, FontSize: fontSize }
    });

    var ajaxData = '{"chatRoomId":"' + chatRoomId + '", "token":"' + token + '", "message":"' + message.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
    if (toUserId != null) ajaxData += ', "toUserId":"' + toUserId + '"';
    if (isBold) ajaxData += ', "bold":true';
    if (isItalic) ajaxData += ', "italic":true';
    if (isUnderline) ajaxData += ', "underline":true';
    ajaxData += ', "color":"' + color + '"';
    if (fontName != '') ajaxData += ', "fontName":"' + fontName + '"';
    if (fontSize != '') ajaxData += ', "fontSize":"' + fontSize + '"';

    ajaxData += '}';

    // Send message to server
    $.ajax({
        type: "POST",
        url: "ChatEngine.svc/SendMessage",
        data: ajaxData,
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        success: function(msg) {
            //$.debug(msg);
        }
    });
}

function privateChat(userId) {
    if (getPrivateTabIndex(userId) == -1) {
        createPrivateChatTab(userId, true);
    } else {
        $("#tabs").tabs('select', getPrivateTabIndex(userId));
    }
}

function getTargetUserId() {
    var targetUserId = null;
    if (messengerMode) {
        targetUserId = messengerTargetUserId;
    } else {
        if (activePanel.attr('id') != 'panel-room') {
            targetUserId = activePanel.attr('id').replace('panel-', '');
        }
    }

    return targetUserId;
}

function createPrivateChatTab(userId, select) {
    var user = onlineUsers[userId];
    $("#tabs").tabs('add', '#panel-' + userId, user.DisplayName);
    if (select == true) {
        $("#tabs").tabs('select', $("#tabs").tabs('length') - 1);
    }
}

function getPanelForMessage(message) {
    if (!messengerMode) {
        var messagePanel = $('#panel-room');
        if (message.ToUserId != null) {
            var panelId = message.FromUserId;
            if (panelId == userId) panelId = message.ToUserId;
            if (getPrivateTabIndex(panelId) == -1) {
                createPrivateChatTab(panelId);
            }
            messagePanel = $('#panel-' + panelId);
        }

        return messagePanel;
    } else {
        return getPanelByUserId(messengerTargetUserId);
    }
}

function getPanelByUserId(userId) {
    if (userId == null) {
        return $('#panel-room');
    } else {
        // replace non-alphanumeric characters in the userid
        return $('#panel-' + userId.replace(/[^\w]/g, '_'));
    }
}

$.fn.setCursorPosition = function(pos) {
    this.each(function(index, elem) {
        if (elem.setSelectionRange) {
            elem.setSelectionRange(pos, pos);
        } else if (elem.createTextRange) {
            var range = elem.createTextRange();
            range.collapse(true);
            range.moveEnd('character', pos);
            range.moveStart('character', pos);
            range.select();
        }
    });
    return this;
};

$.alert = function(title, message) {
    var div = $('<div title="' + title + '">').html(message);
    $("body").append(div);
    div.dialog();
};
$.urlParam = function(name) {
    var results = new RegExp('[\\?&]' + name + '=([^&#]*)').exec(window.location.href);
    if (!results) {
        return null;
    }
    return results[1] || null;
};
$.debug = function(obj, maxDepth, prefix) {
    var result = '';
    if (!prefix) prefix = '';
    for (var key in obj) {
        if (typeof obj[key] == 'object') {
            if (maxDepth !== undefined && maxDepth <= 1) {
                result += (prefix + key + '=object [max depth reached]<br>');
            } else {
                result += print(obj[key], (maxDepth) ? maxDepth - 1 : maxDepth, prefix + key + '.');
            }
        } else {
            result += (prefix + key + ' = ' + obj[key] + '<br>');
        }
    }
    outputSystemMessage(result);
};
$.htmlEncode = function(value) { return $('<div/>').text(value).html(); };
$.htmlDecode = function(value) { return $('<div/>').html(value).text(); };

//called by DetectWebcam.swf

function WebcamDetected(detected) {
    webcamdetected = detected;
    if (!videoChatEnabled || !webcamdetected) {
        $("#videoBroadcastButtonContainer").hide();
    } else {
        $("#videoBroadcastButtonContainer").show();
    }
}