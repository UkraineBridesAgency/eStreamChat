function Uba() {
    var context = this;
    
    $('.right-section .chat-button').live('click', function () {
        var user = onlineUsers[context.userId];

        if (user.Gender == 2) {
            context._stopChat();
            document.location.href = '/Search?o=True';
        } else {
            context._closeChat(
            '<div class="finished-chat">' +
                '<h2>Thank you for using the Ukraine Brides Agency live chatting system.</h2>' +
                '<p>Perhaps you might like to follow up this chat in the following ways:</p>' +
                '<ul class="finished-chat-call-to-actions"><li class="finished-chat-message"><a href="/Messages/Create">send her a thank-you message</a></li>' +
                '<li class="finished-chat-gifts"><a href="/Gifts">send her a gift</a></li>' +
                '<li class="finished-chat-meeting"><a href="/Meeting">organise to meet her</a></li>' +
                '<li class="finished-chat-chat-online"><a href="/ChatOnline">book your next live chat</a></li>' +
                '<li class="finished-chat-get-credits"><a href="/GetCredits">purchase more credits</a></li></ul>' +
                '<div class="clear"></div>' +
                '<p>If you have any feedback to give about the chat, feel free to send your thoughts to us via our contact form on the website.</p>' +
                '<p><a href="/Profile/ControlPanel">Return to your control panel</a></p>' + 
            '</div>');
        }
    });
    
    this.UserConnected = function () {
        this.StartCreditsRemainingPoll();
        
        // clear the disconnectedTimeout if they've reconnected again
        if (this.disconnectedTimeout) {
            clearTimeout(this.disconnectedTimeout);
        }
    };

    this.UserDisconnected = function () {
        var that = this,
            user = onlineUsers[this.userId],
            closeChatTemplate =
            '<div class="finished-chat">' +
                '<p>' + this.target + ' has left the chat.</p>' +
                (user.Gender == 2
                    ? ('<a href="/Search?o=True" class="chat-button">OK</a>')
                    : ('<h2>Thank you for using the Ukraine Brides Agency live chatting system.</h2>' +
                        '<p>Perhaps you might like to follow up this chat in the following ways:</p>' +
                        '<ul class="finished-chat-call-to-actions"><li class="finished-chat-message"><a href="/Messages/Create">send her a thank-you message</a></li>' +
                        '<li class="finished-chat-gifts"><a href="/Gifts">send her a gift</a></li>' +
                        '<li class="finished-chat-meeting"><a href="/Meeting">organise to meet her</a></li>' +
                        '<li class="finished-chat-chat-online"><a href="/ChatOnline">book your next live chat</a></li>' +
                        '<li class="finished-chat-get-credits"><a href="/GetCredits">purchase more credits</a></li></ul>' +
                        '<div class="clear"></div>' +
                        '<p>If you have any feedback to give about the chat, feel free to send your thoughts to us via our contact form on the website.</p>' +
                        '<p><a href="/Profile/ControlPanel">Return to your control panel</a></p>')) +
            '</div>';
        
        // in 10 seconds if they don't connect again, close the chat
        that.disconnectedTimeout = setTimeout(function() {
            that._closeChat(closeChatTemplate);
        }, 10000);
    };

    this.StartCreditsRemainingPoll = function () {
        this._refreshCreditsRemaining();

        var that = this;
        // start subtracting credits from the guy every minute
        clearTimeout(this.creditsRemainingId);
        this.creditsRemainingId = setTimeout(function () {
            that.StartCreditsRemainingPoll();
        }, 5000);
    };

    this._refreshCreditsRemaining = function () {
        var usernames = [];
        usernames.push(this.userId);
        usernames.push(this.target);

        var that = this;
        $.ajax({
            url: '/chat/ChatEngine.svc/GetCreditsRemaining',
            type: 'POST',
            data: JSON.stringify({
                usernames: usernames
            }),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function (data) {
                var creditsRemaining = data.d;
                if (creditsRemaining != null) {
                    if (creditsRemaining < 6) {
                        if (creditsRemaining < 1) {
                            // close chat in 1 minute if they have previously been chatting. If they haven't been 
                            // chatting previously, they somehow got to this page incorrectly, their credits are 
                            // 0 so chat should immediately be closed
                            var user = onlineUsers[that.userId],
                                closeChatTemplate =
                                '<div class="finished-chat">' +
                                    (user.Gender == 2
                                        ? ('<p>Sorry, it seems that ' + that.target + ' has run out of credits. You will be unable to chat with him until he purchases more.</p>' +
                                            '<form action="/Profile/ControlPanel" method="get"><input type="submit" value="OK" /></form>')
                                        : ('<h2>Sorry, you do not have enough credits to continue this online chat.</h2>' +
                                            '<p><a href="/GetCredits">Click here to purchase more credits</a></p>' +
                                            '<p>After you have added more credits your account, perhaps you might like to follow up this chat in the following ways:</p>' +
                                            '<ul class="finished-chat-call-to-actions"><li class="finished-chat-message"><a href="/Messages/Create">send her a thank-you message</a></li>' +
                                            '<li class="finished-chat-gifts"><a href="/Gifts">send her a gift</a></li>' +
                                            '<li class="finished-chat-meeting"><a href="/Meeting">organise to meet her</a></li>' +
                                            '<li class="finished-chat-chat-online"><a href="/ChatOnline">book your next live chat</a></li>' +
                                            '<li class="finished-chat-get-credits"><a href="/GetCredits">purchase more credits</a></li></ul>' +
                                            '<div class="clear"></div>' +
                                            '<p>Thank you for using the Ukraine Brides Agency live chatting system. If you have any feedback to give about the chat, feel free to send your thoughts to us via our contact form on the website.</p>')) +
                                '</div>';
                            if (that.haveBeenChatting) {
                                setTimeout(
                                    $.proxy(function () {
                                        that._closeChat(closeChatTemplate);
                                    }, that)
                                , 60000);
                            } else {
                                var closeNow = $.proxy(function () {
                                    that._closeChat(closeChatTemplate);
                                }, that);
                                closeNow();
                            }
                        } else if (!that.warningShown) {
                            that.warningShown = true;

                            // tell them that their chat will finish soon
                            $('#dialog-container')
                                .text('Please note: you only have 5 more credits remaining. Purchase more credits to continue chatting :)')
                                .dialog('open');
                            // style the credits remaining label appropriately
                            $('#remaining-credits-label').addClass('almost-finished');
                        }
                    }

                    that.haveBeenChatting = true;
                    $('#remaining-credits-label span').text(creditsRemaining);
                }
            }
        });
    };

    this._closeChat = function (template) {
        // replace the window's content where the only thing they can do is close the window
        $('.content').html(template);
        $('#footer').remove();

        this._stopChat();
    };

    this._stopChat = function () {
        // stop checking credits remaining
        clearTimeout(this.creditsRemainingId);

        // make user leave chatroom
        $.ajax({
            type: 'POST',
            url: '/chat/ChatEngine.svc/LeaveChatRoom',
            data: '{"chatRoomId":"' + this.chatRoomId + '", "token":"' + this.token + '", "messengerTargetUserId":' + '"' + this.target + '"}',
            contentType: 'application/json; charset=utf-8',
            dataType: 'json'
        });

        // close any dialog that may be open
        $('#dialog-container').dialog('close');

        // make it so the beforeunload message doesn't appear
        $(window).unbind('beforeunload');

        // stop listening for new chat events
        stopEventsTimer();
    };

    $('.toggle-broadcast-video').live('click', function () {
        var $link = $(this),
            $videoContainer = $link.parent();

        if (context.isVideoBroadcastVisible()) {
            // hide the video
            var videoHeight = $videoContainer.outerHeight() - 4;

            $videoContainer.animate({ bottom: -videoHeight }, 500, function () {
                $link.text('show');
            });
        } else {
            // show the video
            $videoContainer.animate({ bottom: 0 }, 500, function () {
                $link.text('hide');
            });
        }
    });

    this.isVideoBroadcastVisible = function() {
        // base visibility of the text
        return $('.toggle-broadcast-video').text() === 'hide';
    };

    return true;
}