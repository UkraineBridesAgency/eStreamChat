﻿<%@ Page Language="C#" AutoEventWireup="true" %>

<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Ukraine Brides | Live chatting system</title>
    <link href="Styles/Style.css" rel="stylesheet" type="text/css" />
    <link href="Styles/jquery.contextMenu.css" rel="stylesheet" type="text/css" />
    <link href="Styles/msdropdown/dd.css" rel="stylesheet" type="text/css" />
</head>
<body data-messengermode="true">
    <div class="messenger">
        <script src="http://code.jquery.com/jquery-1.7.2.min.js" type="text/javascript"></script>
        <script src="http://code.jquery.com/ui/1.8.20/jquery-ui.min.js" type="text/javascript"></script>
        <script src="Scripts/jquery.jqote2.js" type="text/javascript"></script>
        <script src="Scripts/jquery.blink.js" type="text/javascript"></script>
        <script src="Scripts/jquery.colorPicker.js" type="text/javascript"></script>
        <script src="Scripts/jquery.emoticon.js" type="text/javascript"></script>
        <script src="Scripts/jquery.dd.js" type="text/javascript"></script>
        <script src="Scripts/jquery.ajaxfileupload.js" type="text/javascript"></script>
        <script src="Scripts/jquery.contextMenu.mod.js" type="text/javascript"></script>
        <script src="Scripts/Uba.js?v=19" type="text/javascript"></script>
        <script src="Scripts/eStreamChat.js?v=19" type="text/javascript"></script>
        <script src="App_Themes/<%= Theme %>/layout.js" type="text/javascript"></script>
        <span id="templates" data-url="App_Themes/<%= Theme %>/templates.html?v=19" style="display: none"></span>
        <bgsound id="sound" />
        <span id="spanSound"></span>
        <div id="fileUploadDialog" title="Send File" style="display: none">
            <p><input type="file" id="fileUpload" name="fileUpload" size="23"/></p>
            <p><button id="uploadButton">Upload</button></p>     
        </div>
        <div id="dialog-container" style="display: none"></div>
        <div id="container">
            <form id="form1" runat="server">
                <div id="header">
                    <img src="<%= Page.ResolveUrl("~/../Images/Site/ukraine-brides-home.gif") %>" alt=""/>
                    <div class="right-section">
                        <label id="remaining-credits-label">
                            Credits remaining: <span>~</span>
                        </label>
                        <a href="#" class="chat-button">Close chat</a>
                    </div>
                </div>
                <div class="content">
                    <div id="section">
                        <div id="tabs">
                            <div id="tabs-inner">
                                <ul><li><a href="#panel-room">Room</a></li></ul>
                                <div id="panel-room" class="messages"></div>
                            </div>
                        </div>
                    </div>
                    <div id="aside_messenger">
                        <div class="video-container">
                            <div id="divTargetUserVideo" class="video_first"></div>
                            <div id="divCurrentUserVideo" class="video_second">
                                <a class="toggle-broadcast-video" href="#">hide</a>
                            </div>
                        </div>
                        <div class="chat-rules">
                            <h3>Chat conditions</h3>
                            <p>Chats are 1 credit per minute</p>
                            <p>The lady may end the chat at any time if she finds you to be unpleasant or obscene. <strong>Your credits will not be refunded if the lady ends the chat</strong> for any of these reasons.</p>
                            <p><strong>The exchange of contact details is not permitted</strong> and will result in you being deactivated from the site. Any unused credits will not be refunded.</p>
                            <p>We have a facility on the site for you to request the ladies contact details. If you want to contact her directly you must use the site to obtain these details. We will not be responsible for her actions outside of the site and can only assist and protect you if you use the site to contact her.</p>
                            <p><strong>Please advise us if the lady attempts to give you her contact details or asks for financial assistance or gifts</strong>. There are strict rules against her doing this and it often means that she intends to scam you. We want to know so that we can control this and protect you.</p>
                            <p>We are not responsible for chat quality, including loss of sound or picture. Quality issues are generally to do with your internet connection or hardware rather than anything to do with this website.</p>
                            <p>We welcome your feedback on chats.</p>
                            <p>If you are having any problems with your live chat, please visit the <a href="/ChatProblems" title="clicking this link will end your chat">chat troubleshooting page</a> for suggestions on what might fix some possible issues you may be having. <em>Please note: clicking this link will end your chat</em>.</p>
                        </div>
                    </div>
                </div>
                <div id="footer">
                    <div id="button-panel" class="text_format">
                        <span id="formatButtons" class="text-icons">
                            <input type="checkbox" id="checkBold" /><label for="checkBold" class="bold"></label>
                            <input type="checkbox" id="checkItalic" /><label for="checkItalic" class="italic"></label>
                            <input type="checkbox" id="checkUnderline" /><label for="checkUnderline" class="underline"></label>
                        </span>
                        <span class="color_picker_wrap"><input id="textColor" type="text" value="#000000" /></span>
                        <select id="dropFontName" class="ui-button ui-widget ui-state-default ui-corner-left">
                            <option value="">Font</option>
                            <option value="Arial">Arial</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Wingdings">Wingdings</option>
                            <option value="Courier">Courier</option>
                            <option value="Impact">Impact</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                        </select>
                        <select id="dropFontSize" class="ui-button ui-widget ui-state-default  ui-corner-right">
                            <option value="">Size</option>
                            <option value="7">7</option>
                            <option value="8">8</option>
                            <option value="9">9</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                            <option value="14">14</option>
                            <option value="15">15</option>
                            <option value="16">16</option>
                            <option value="18">18</option>
                            <option value="20">20</option>
                            <option value="22">22</option>
                            <option value="28">28</option>
                            <option value="32">32</option>
                        </select>
                        <span class="emoticons-container"></span>
                        <span class="options_btn"><input type="button" id="fileUploadDialogButton" class="send_file" title="send file" /></span>
                        <span class="text-icons"><input type="checkbox" id="checkAlert" /><label for="checkAlert" class="alert"></label></span>
                        <span id="videoBroadcastButtonContainer" style="display:none; position: relative;">
                            <input type="button" class="broadcast_video" id="checkVideoBroadcast" title="Broadcast video" />
                            <span style="color:red; position: absolute; top: 16px; left: 35px; width: 400px;"><< Click the webcam icon to start/stop your video</span>
                        </span>
                    </div>
                    <div class="send_msg">
                        <input id="messageInput" type="text" />
                        <button id="sendButton">Send</button><br />
                        <div class="translate-messages-container">
                            <label><input type="checkbox" id="translateMessages" checked="checked" /> Автоматический перевод сообщений?</label>
                        </div>
                    </div>
                </div>
                <div id="webcamdetector"></div>
            </form>
        </div>
    </div>
</body>
</html>