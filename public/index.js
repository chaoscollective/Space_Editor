// -----------------------------------------
// Right-click context menu plugin for jQuery...
// -----------------------------------------
(function ($) {
  /**
   * @author corey aufang (with many modifications by seewhatsticks dev team)
   * @version 1.0.1
   */
  $.conmenu = function (options) {
    var alreadyHandled = false;
    // first check to see if we already have the selector.
    for (var i = 0; i < items.length; i++) {
      if (options.selector == items[i].selector) {
        //console.log("Overwriting previous rightclick handler: " + options.selector);
        items[i] = options;
        alreadyHandled = true;
      }
    }
    if (!alreadyHandled) {
      // add a new selector to the set.
      items.push(options);
    }
    $(options.selector).bind(window.opera ? 'click' : 'contextmenu', showmenu);
  };
  //defaults
  $.conmenu.containerType = 'div';
  $.conmenu.choicesType = 'div';
  var items = [];
  var container = document.createElement($.conmenu.containerType);
  var marker = document.createElement($.conmenu.containerType);
  $(container).addClass("rightClickContainer");
  $(marker).addClass("rightClickMarker");
  $(document).ready(function () {
    $(container).hide().attr('id', 'conmenu').css('position', 'absolute').appendTo(document.body);
    $(marker).hide().attr('id', 'conmenuMarker').css('position', 'absolute').appendTo(document.body);
  });
  
  function mouseDownGrabber(clickEvent){
  clickEvent.stopPropagation();
    resetMenu();
  console.log("I eat your clicks!");
  }

  function showmenu(event) {
    event.stopPropagation();
    resetMenu();
    if (window.opera && !event.ctrlKey) {
      return;
    }
    else {
      $(document.body).bind('mousedown', mouseDownGrabber);
    }
    var foundFirst = false;
    $.each(items, function () {
      if ($.inArray(event.currentTarget, $(this.selector)) > -1) {
        $.each(this.choices, function () {
          if (!foundFirst) {
            foundFirst = true;
          }
          var action = this.action;
          $(document.createElement($.conmenu.choicesType)).addClass("rightClickItem").html(this.label).mousedown(function (clickEvent) {
            clickEvent.stopPropagation();
            resetMenu();
            action(event.currentTarget);
          }).appendTo(container);
        });
      }
    });
    var size = {
      'height': $(window).height(),
      'width': $(window).width(),
      'sT': $(window).scrollTop(),
      'cW': $(container).width(),
      'cH': $(container).height()
    };
    //console.log(container);
    $(marker).css({
      'left': (event.clientX - 3),
      'top': (event.clientY - 3)
    }).show();
    $(container).css({
      'left': ((event.clientX + size.cW) > size.width ? (event.clientX - size.cW) : event.clientX),
      'top': ((event.clientY + size.cH) > size.height && event.clientY > size.cH ? (event.clientY + size.sT - size.cH) : event.clientY + size.sT)
    }).show();
    //console.log(container);
    return false;
  }

  function resetMenu() {
    $(container).hide().empty();
    $(marker).hide();
  $(document.body).unbind('mousedown', mouseDownGrabber);
  }
})(jQuery);
// -----------------------------------------
// JQuery plugin disable selection.
// -----------------------------------------
(function($){
  $.fn.disableSelection = function() {
    return this.each(function() {           
    $(this).attr('unselectable', 'on').css({
      '-moz-user-select':'none',
      '-webkit-user-select':'none',
      'user-select':'none'
    }).each(function() {
      this.onselectstart = function() { return false; };
    });
  });
};
})(jQuery);
// -----------------------------------------
// Editor
// -----------------------------------------
var pageLoadID                 = Math.floor(Math.random()*100000);
var editor                     = null;
var nowClientID                = 0;
var allCollabInfo              = [];
var initialStateIsWelcome      = true;
var alreadyRequestedRemoteFile = false;
var TIME_UNTIL_GONE            = 15000;
var NOTIFICATION_TIMEOUT       = 10000;
var autoCheckStep              = 0;
function ifOnlineLetCollaboratorsKnowImHere(){
  if(!nowIsOnline){
    return; 
  }
  var range = editor.getSelectionRange();
  now.s_sendCursorUpdate(infile, range, true);
}
function ifOnlineVerifyCollaboratorsAreStillHere_CleanNotifications_AutoSave(){
  if(!nowIsOnline){
    return;
  }
  autoCheckStep++;
  var t = (new Date()).getTime();
  var activeCollabs = 0;
  for(var prop in allCollabInfo) {
      if(allCollabInfo.hasOwnProperty(prop)){
      var cInfo = allCollabInfo[prop];
      if(cInfo['isShown']){
        var tDiff = t - cInfo['timeLastSeen'];
        if(tDiff > TIME_UNTIL_GONE){
          console.log("Looks like " + cInfo['name'] + " is no longer around.");
          var lastCursorID = cInfo['lastCursorMarkerID'];
          var ses = editor.getSession();
          if(lastCursorID !== undefined){
             ses.removeMarker(lastCursorID); // remove collaborator's cursor.
          }
          var lastSelID = cInfo['lastSelectionMarkerID'];
          if(lastSelID !== undefined){
             ses.removeMarker(lastSelID); // remove collaborator's selection.
          }
          cInfo['isShown'] = false;
        }else{
          activeCollabs++;
        }
      }
    }
  }
  if(activeCollabs > 0){
    $("#whoAreThey").html("+"+activeCollabs);
    if(activeCollabs == 1){
      $("#whoAreThey").attr("title", activeCollabs+" other person collaborating");
    }else{
      $("#whoAreThey").attr("title", activeCollabs+" other people collaborating");
    }
  }else{
    $("#whoAreThey").html("0");
    $("#whoAreThey").attr("title", "No one else is collaborating");
  }
  $(".notificationItem").each(function(index, el){
    var pt = $(el).attr('postTime');
    if((t-pt) > NOTIFICATION_TIMEOUT){
      $(el).fadeOut(500, function(){
        $(el).remove();
      });
    }
  });
  // auto-save if neccessary...
  var saveRequestedForRemoteUser = ((t-timeOfLastPatch) > 10000 && Math.random() > 0.7);
  var saveRequestedForMe = (timeOfLastPatch < timeOfLastLocalChange && (t-timeOfLastLocalChange) > 2000);
  var typingInProgress  = (timeOfLastLocalKepress > timeOfLastLocalChange);
  //console.log("typing in progress: " + typingInProgress);
  //console.log("saveRequestedForMe: " + saveRequestedForMe + ", " + timeOfLastPatch + " <? " +timeOfLastLocalChange);
  if(fileIsUnsaved && !saveIsPending && !typingInProgress && (saveRequestedForRemoteUser || saveRequestedForMe)){
    // save it!
    console.log("AUTO SAVE! ");
    saveFileToServer();
  }
  /*
  if($("#hud").is(":visible")){
    updateHUD();
  }
  */
}
function removeAllCollaborators(){
  console.log("Removing all previous collaborators...");
  for(var prop in allCollabInfo) {
      if(allCollabInfo.hasOwnProperty(prop)){
      var cInfo = allCollabInfo[prop];
      console.log("trying to remove: " + cInfo['name']);
      cInfo['timeLastSeen'] -= TIME_UNTIL_GONE;
    }
  }
  ifOnlineVerifyCollaboratorsAreStillHere_CleanNotifications_AutoSave();
}
// -----------------------------------------
// Diff-Match-Patch.
// -----------------------------------------
var patchQueue        = [];
var patchingInProcess = false;
var previousText      = "";
var dmp               = new diff_match_patch();
dmp.Diff_Timeout      = 1;
dmp.Diff_EditCost     = 4;
var updateWithDiffPatchesLocal = function(id, patches, md5){
  if(patchingInProcess){
    console.log("patching in process.. queued action.");
    patchQueue.push({id: id, patches: patches, md5: md5});
    return;
  }
  patchingInProcess = true;
  var t = (new Date()).getTime();
  if(id != now.core.clientId){
    console.log("patching from user: " + id + ", md5=" + md5); 
    //console.log("PATCHES");
    //console.log(patches);
    
    var currentText = editor.getSession().getValue();
    var localChangeJustSent = sendTextChange(); // make sure we send any outstanding changes before we apply remote patches.
    
    var results = dmp.patch_apply(patches, currentText);
    var newText = results[0];
    
    // TODO: get text around cursor and then use it later for a fuzzy-match to keep it in the same spot.
    //console.log("DIFF TO DELTAS");
    var diff = dmp.diff_main(currentText, newText);
    var deltas = dmp.diff_toDelta(diff).split("\t");
    //console.log(deltas);
    
    var doc = editor.getSession().doc;
    
    //
    // COMPUTE THE DIFF FROM THE PATCH AND ACTUALLY INSERT/DELETE TEXT VIA THE EDITOR (AUTO TRACKS CURSOR, AND DOESN'T RESET THE ENTIRE TEXT FIELD).
    //
    var offset = 0;
    var row = 1;
    var col = 1;
    var aceDeltas = [];
    for(var i=0; i<deltas.length; i++){
      var type = deltas[i].charAt(0);
      var data = decodeURI(deltas[i].substring(1));
      //console.log(type + " >> " + data);
      switch(type){
        case "=": { // equals for number of characters.
          var sameLen = parseInt(data);
          for(var j=0; j<sameLen; j++){
            if(currentText.charAt(offset+j) == "\n"){
              row++;
              col = 1;
            }else{
              col++;
            }
          }
          offset += sameLen;
          break;
        }
        case "+": { // add string.
          var newLen = data.length;
          //console.log("at row="+row+" col="+col+" >> " + data);
          var aceDelta = {
                  action: "insertText",
                  range: {start: {row: (row-1), column: (col-1)}, end: {row: (row-1), column: (col-1)}}, //Range.fromPoints(position, end),
                  text: data
              };
          aceDeltas.push(aceDelta);
          var innerRows = data.split("\n");
          var innerRowsCount = innerRows.length-1;
          row += innerRowsCount;
          if(innerRowsCount <= 0){
            col += data.length;
          }else{
            col = innerRows[innerRowsCount].length+1;
          }
          //console.log("ended at row="+row+" col="+col);
          break;
        }
        case "-": { // subtract number of characters.
          var delLen = parseInt(data);
          //console.log("at row="+row+" col="+col+" >> " + data);
          var removedData = currentText.substring(offset, offset+delLen);
          //console.log("REMOVING: " + removedData);
          var removedRows = removedData.split("\n");
          //console.log(removedRows);
          var removedRowsCount = removedRows.length-1;
          //console.log("removed rows count: " + removedRowsCount);
          var endRow = row + removedRowsCount;
          var endCol = col;
          if(removedRowsCount <= 0){
            endCol = col+delLen;
          }else{
            endCol = removedRows[removedRowsCount].length+1;
          }
          //console.log("end delete selection at row="+endRow+" col="+endCol);
          var aceDelta = {
                  action: "removeText",
                  range: {start: {row: (row-1), column: (col-1)}, end: {row: (endRow-1), column: (endCol-1)}}, //Range.fromPoints(position, end),
                  text: data
              };
          aceDeltas.push(aceDelta);
          //console.log("ended at row="+row+" col="+col);      
          offset += delLen;
          break;
        }
      }
    }
    
    ignoreAceChange = true;
    doc.applyDeltas(aceDeltas);
    previousText = newText;
    ignoreAceChange = false;
    
    if(!localChangeJustSent && (t - timeOfLastLocalChange) > 2000){
      //console.log("no local changes have been made in a couple seconds >> md5 should match..");
      var newMD5 = Crypto.MD5(newText);
      if(md5 == newMD5){
        setFileStatusIndicator("changed");
      }else{
        setFileStatusIndicator("error");
        console.log("** OH NO: MD5 mismatch. this="+newMD5+", wanted="+md5);
        now.s_requestFullFileFromUserID(infile, id, function(fname, fdata, err, isSaved){
          if(fname != infile){
            console.log("Oh No! They sent me a file that I don't want: " + fname);
            return;
          }
          console.log("### FULL FILE UPDATE (from remote user)...");
          var patch_list = dmp.patch_make(previousText, fdata);
          var patch_text = dmp.patch_toText(patch_list);
          var patches    = dmp.patch_fromText(patch_text);
          var md5        = Crypto.MD5(fdata);
          updateWithDiffPatchesLocal(id, patches, md5);
        });
      }
    }
    timeOfLastPatch = t;
  }else{
    console.log("saw edit from self. not using it.");
  }
  patchingInProcess = false;
  if(patchQueue.length > 0){
    console.log("Patching from Queue! DOUBLE CHECK THIS.");
    var nextPatch = patchQueue.shift(); // get the first patch off the queue.
    updateWithDiffPatchesLocal(nextPatch.id, nextPatch.patches, nextPatch.md5);
  }
}
// -----------------------------------------
// Now.JS Client-side functions.
// -----------------------------------------
now.c_updateCollabCursor    = function(id, name, range, changedByUser){
  if(id == now.core.clientId){
    return;
  }
  var cInfo = allCollabInfo[id];
  if(cInfo == undefined){
    // first time seeing this user!
    allCollabInfo[id] = [];
    cInfo = allCollabInfo[id];
    cInfo['name'] = name;
    // let collaborator know I'm here.
    ifOnlineLetCollaboratorsKnowImHere();
  } 
  cInfo['timeLastSeen'] = (new Date()).getTime();
  var ses = editor.getSession();
  var rSel = Range.fromPoints(range.start, range.end);
  var rCur = Range.fromPoints(range.start, {row: range.start.row, column: range.start.column+1});
  var lastSelID = cInfo['lastSelectionMarkerID'];
  if(lastSelID !== undefined){
     ses.removeMarker(lastSelID);
  }
  var lastCursorID = cInfo['lastCursorMarkerID'];
  if(lastCursorID !== undefined){
     ses.removeMarker(lastCursorID);
  }
  var userColor = userColorMap[id%userColorMap.length];
  cInfo['lastSelectionMarkerID'] = ses.addMarker(rSel, "collab_selection", "line", false); // range, clazz, type/fn(), inFront
  cInfo['lastCursorMarkerID']    = ses.addMarker(rCur, "collab_cursor", function(html, range, left, top, config){
    html.push("<div class='collab_cursor' style='top: "+top+"px; left: "+left+"px; border-left-color: "+userColor+"; border-bottom-color: "+userColor+";'><div class='collab_cursor_nametag' style='background: "+userColor+";'>&nbsp;"+cInfo['name']+"&nbsp;<div class='collab_cursor_nametagFlag' style='border-right-color: "+userColor+"; border-bottom-color: "+userColor+";'></div></div>&nbsp;</div>");  
  }, false); // range, clazz, type, inFront
  cInfo['isShown'] = true;  
}
now.c_updateWithDiffPatches = function(id, patches, md5){
  //console.log(patches);
  updateWithDiffPatchesLocal(id, patches, md5);
}
now.c_userRequestedFullFile = function(fname, collabID, fileRequesterCallback){
  //if(!initialStateIsWelcome){
    console.log("user requesting full file: " + fname + " >> " + collabID);
    if(infile == fname){
      fileRequesterCallback(infile, previousText, null, false); // (fname, filedata, err, isSaved)
    }else{
      console.log("Oh No! They think I'm editing a file I'm not. I'm in: " + infile);
    }
  //}else{
  //  console.log("received request for initial state, but I just got here. ignoring.");
  //}
}
now.c_fileStatusChanged     = function(fname, status){
  if(fname == infile){
    setFileStatusIndicator(status);
  }else{
    console.log("saw file status change for wrong file: " + fname);
  }
}
now.c_processUserFileEvent  = function(fname, event, fromUserId, usersInFile, secondaryFilename, msg){
  /*
  if(fromUserId == now.core.clientId){
    return;
  }
  */
  var uInfo = allCollabInfo[fromUserId];
  var uName = "???";
  if(uInfo != undefined){
    uName = uInfo.name;
  }
  if(fromUserId == now.core.clientId){
    uName = now.name;
  }
  console.log("UserFileEvent: " + event + " >> " + fname + " >> " + uName + ", usersInFile: " + usersInFile);
  if(event == "joinFile"){
    setUsersInFile(fname, usersInFile);
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "joined file: <div class='itemType_fileAction'>"+fname+"</div>");
    console.log("added notify for joinFile");
  }
  if(event == "leaveFile"){
    setUsersInFile(fname, usersInFile);
    if(fname == infile){
      // remove the user's marker, they just left!
      var cInfo = allCollabInfo[fromUserId];
      if(cInfo != undefined){
        cInfo['timeLastSeen'] -= TIME_UNTIL_GONE;
      }
    }
  }
  if(event == "deleteFile"){
    removeFileFromList(fname);
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "deleted file: <div class='itemType_fileAction'>"+fname+"</div>");
  }
  if(event == "createFile"){
    addFileToList(fname);
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "created file: <div class='itemType_fileAction'>"+fname+"</div>");
  }
  if(event == "renameFile" && secondaryFilename != undefined){
    removeFileFromList(fname);
    addFileToList(secondaryFilename);
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "renamed file: <div class='itemType_fileAction'>"+fname+"</div><div style='text-align: right'>to</div><div class='itemType_fileAction'>"+secondaryFilename+"</div>");
  }
  if(event == "duplicateFile" && secondaryFilename != undefined){
    addFileToList(secondaryFilename);
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "duplicated file: <div class='itemType_fileAction'>"+fname+"</div><div style='text-align: right'>as</div><div class='itemType_fileAction'>"+secondaryFilename+"</div>");
  }
  if(event == "commitProject"){
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "commited project with note: <div class='itemType_projectAction'>"+msg+"</div>");
  }
  if(event == "launchProject"){
    console.log("launch!");
    var userColor = userColorMap[fromUserId%userColorMap.length];
    notifyAndAddMessageToLog(userColor, uName, "<div class='itemType_projectAction'>Launched the project!</div>");
  }
  updateHUD();
}
now.c_processUserEvent      = function(event, fromUserId, fromUserName){
  if(fromUserId == now.core.clientId){
    return;
  }
  var cInfo = allCollabInfo[fromUserId];
  if(cInfo == undefined){
    allCollabInfo[fromUserId] = [];
    cInfo = allCollabInfo[fromUserId];
    cInfo['name'] = fromUserName;
    cInfo['timeLastSeen'] = 0;
  }
  console.log("UserEvent: " + event + " >> " + fromUserName);
  var userColor = userColorMap[fromUserId%userColorMap.length];
  if(event == "join"){
    mostRecentTotalUserCount++;
    notifyAndAddMessageToLog(userColor, fromUserName, "has joined.");
  }else{
    mostRecentTotalUserCount--;
    notifyAndAddMessageToLog(userColor, fromUserName, "has left.");
  }
  updateHUD();
}
now.c_processMessage        = function(scope, type, message, fromUserId, fromUserName){
  console.log("msg from "+fromUserId+": " + message);
  var userColor = userColorMap[fromUserId%userColorMap.length];
  var msg = message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  notifyAndAddMessageToLog(userColor, fromUserName, msg);
}
now.c_confirmProject        = function(teamID){
  now.teamID = teamID;
  console.log("PROJECT: " + now.teamID);
  $("#topProjName").html("You're editing <b><a href='http://"+teamID+".chaoscollective.org/' target='_APP_"+teamID+"' style='text-decoration: none; color: #000;'>"+teamID+"</a></b>.");
}
// ---------------------------------------------------------
// Main functions...
// ---------------------------------------------------------
var infile                 = "";
var cursorChangeTimeout    = null;
var textChangeTimeout      = null;
var initialFileloadTimeout = null; 
var nowIsOnline            = false;
var ignoreAceChange        = false;
var openIsPending          = false;
var timeOfLastLocalChange  = (new Date()).getTime();
var timeOfLastLocalKepress = (new Date()).getTime();
var timeOfLastPatch        = (new Date()).getTime();
var fileIsUnsaved          = false;
var saveIsPending          = false;
function sendTextChange(){
  textChangeTimeout = null;
  //console.log("send text change.");
  var currentText = editor.getSession().getValue();
  if(currentText === previousText){
    //console.log("text is the same. sidestepping update.");
    return false;
  }
  setFileStatusIndicator("changed");
  var md5        = Crypto.MD5(currentText);
  var patch_list = dmp.patch_make(previousText, currentText);
  var patch_text = dmp.patch_toText(patch_list);
  var patches    = dmp.patch_fromText(patch_text);
  previousText   = currentText;
  timeOfLastLocalChange = (new Date()).getTime();
  now.s_sendDiffPatchesToCollaborators(infile, patches, md5);
  return true;
}
function openFileFromServer(fname, forceOpen){
  if(infile == fname && (!forceOpen)){
    console.log("file is already open.");
    return;
  }
  if(!fname || fname == ""){
    console.log("Invalid filename.");
    return;
  }
  if(openIsPending){
    console.log("open is pending... aborting open request for: " + fname);
    return;
  }
  openIsPending = true;
  editor.setReadOnly(true);
  ignoreAceChange = true;
  editor.getSession().setValue(""); // clear the editor.
  initialFileloadTimeout = setTimeout(function(){
    initialStateIsWelcome = false;
  }, 3000);
  if(infile != ""){
    // we're leaving the file we're in. let collaborators know.
    now.s_leaveFile(infile);
  }
  now.s_getLatestFileContentsAndJoinFileGroup(fname, function(fname, fdata, err, isSaved){
    if(err){
      console.log("ERROR: couldn't load file.");
      console.log(err);
      alert("Oh No! We couldn't load that file: "+fname);
      editor.setReadOnly(false);
      ignoreAceChange = false;
      openIsPending = false;
      return;
    }
    infile = fname;
    if($("#recentFile_2").html() == infile){
      $("#recentFile_2").html($("#recentFile_1").html()).attr("fname", $("#recentFile_1").attr('fname'));
      $("#recentFile_1").html($("#recentFile_0").html()).attr("fname", $("#recentFile_0").attr('fname'));
    }else{
      if($("#recentFile_1").html() == infile){
        $("#recentFile_1").html($("#recentFile_0").html()).attr("fname", $("#recentFile_0").attr('fname'));
      }else{
        $("#recentFile_3").html($("#recentFile_2").html()).attr("fname", $("#recentFile_2").attr('fname'));
        $("#recentFile_2").html($("#recentFile_1").html()).attr("fname", $("#recentFile_1").attr('fname'));
        $("#recentFile_1").html($("#recentFile_0").html()).attr("fname", $("#recentFile_0").attr('fname'));
      }
    }
    $("#recentFile_0").html(infile).attr("fname", infile);
    ignoreAceChange = true;  
    editor.getSession().setValue(fdata.replace(/\t/g, "  ")); 
    // TODO: Auto-fold here...
    // addFold("...", new Range(8, 44, 13, 4));
    ignoreAceChange = false;
    editor.setReadOnly(false);
    autoFoldCodeProgressive();
    previousText = editor.getSession().getValue();
    if(isSaved){
      setFileStatusIndicator("saved");
    }else{
      setFileStatusIndicator("changed");
    }
    removeAllCollaborators();
    var f = infile;
    if(fileHasExtention(f, ".js")){
      console.log("setting mode to: JavaScript");
      editor.getSession().setMode(new JavaScriptMode());
    }else{
      if(fileHasExtention(f, ".css") || fileHasExtention(f, ".less")  || fileHasExtention(f, ".styl") ){
        console.log("setting mode to: CSS");
        editor.getSession().setMode(new CSSMode());
      }else{
        if(fileHasExtention(f, ".html")){
          console.log("setting mode to: HTML");
          editor.getSession().setMode(new HTMLMode());
        }else{
          console.log("setting mode to: ???");
          editor.getSession().setMode(new TextMode());
        }
      }
    }
    ifOnlineLetCollaboratorsKnowImHere();
    setURLHashVariable("fname", infile);
    openIsPending = false;
  });
  initialFileloadTimeout = null;
  setFileStatusIndicator("unknown");
}
function fileHasExtention(f, ext){
  return ((f.indexOf(ext) > 0 && f.indexOf(ext) == f.length-ext.length));
}

var mostRecentFilesAndInfo   = [];
var mostRecentTotalUserCount = 1;
function safelyOpenFileFromEntry(el){
  var fname = $(el).attr('fname');
  if(fname != undefined && fname != null && fname != ""){
    console.log("SAFELY OPENING FILE: " + fname);
    openFileFromServer(fname);
    closeFileBrowser();
  }else{
    console.log("Undefined filename... aborting open.");
  }
}
function setUsersInFile(fname, usersInFile){
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var f = mostRecentFilesAndInfo[i];
    if(f[0] == fname){
      f[1] = usersInFile;
      updateFileBrowserFromFileList(mostRecentFilesAndInfo);
      return;
    }
  }
  console.log("Unable to add user from file: " + fname);
}
function getUsersInFile(fname){
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var f = mostRecentFilesAndInfo[i];
    if(f[0] == fname){
      return f[1];
    }
  }
  return 0;
}
function addFileToList(fname){
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var f = mostRecentFilesAndInfo[i];
    if(f[0] == fname){
      console.log("Already have this file.");
      return;
    }
  }
  mostRecentFilesAndInfo.push([fname, 0]);
  updateFileBrowserFromFileList(mostRecentFilesAndInfo);
}
function removeFileFromList(fname){
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var f = mostRecentFilesAndInfo[i];
    if(f[0] == fname){
      mostRecentFilesAndInfo.splice(i, 1);
      updateFileBrowserFromFileList(mostRecentFilesAndInfo);
      return;
    }
  }
}
function saveFileToServer(){
  saveIsPending = true;
    console.log("SAVING FILE:" + infile);
  sendTextChange();  
  if(previousText == ""){
    console.log("THE FILE IS BLANK -- WHY ARE WE SAVING?!")
  }
  now.s_saveUserFileContentsToServer(infile, previousText, function(err){
    if(err){
      console.log("File save error!");
      setFileStatusIndicator("error");
    }else{
      console.log("file save successfully");
      setFileStatusIndicator("saved");
    }
    saveIsPending = false;
  });
}
function setFileStatusIndicator(status){
  switch(status){
    case "saved": {
      $("#dataStatBlock").css({background: "#0F0", "border-radius": "10px", border: "none", margin: 0});
      fileIsUnsaved = false;
      break;
    }
    case "changed": {
      $("#dataStatBlock").css({background: "none", "border-radius": "0px", border: "1px solid #CCC", "margin-left": "-1px", "margin-top": "-1px"});
      fileIsUnsaved = true;
      break;
    }
    case "error":
    case "offline": {
      $("#dataStatBlock").css({background: "#F00", "border-radius": "10px", border: "none", margin: 0});
      break;
    }
    default: {
      $("#dataStatBlock").css({background: "#444", "border-radius": "10px", border: "none", margin: 0});
    }
  }
}
// Editor global variables.
var Range          = require("ace/range").Range;
var JavaScriptMode = require("ace/mode/javascript").Mode;
var CSSMode        = require("ace/mode/css").Mode;
var HTMLMode       = require("ace/mode/html").Mode;
var TextMode       = require("ace/mode/text").Mode;
// ---------------------------------------------------------
// File browser
// ---------------------------------------------------------
var fileBrowserIsOpen = false;
var fileBrowserMouseDownFn = function(event){
  if($(event.target).attr('id') != "fileBrowser" && $(event.target).parents("#fileBrowser").length == 0 && $(event.target).attr('id') != "filebrowserButton"){
    $(document).unbind('mousedown', fileBrowserMouseDownFn);
    closeFileBrowser();
  }
}
function updateFileBrowserFromFileList(filesAndInfo){
  mostRecentFilesAndInfo = filesAndInfo;
  var mediaHTML = "";
  var htmlHTML  = "";
  var cssHTML   = "";
  var jsHTML    = "";
  filesAndInfo.sort(fileSorter_Name);
  //console.log(filesAndInfo);
  for(var i=filesAndInfo.length-1; i>=0; i--){
    var fInfo = filesAndInfo[i];
    var f  = fInfo[0];
    var u  = fInfo[1];
    var sz = fInfo[2];
    if(f == ""){
      // this is the total number of users. Update and remove from file list.
      mostRecentTotalUserCount = u;
      filesAndInfo.splice(i, 1);
      continue;
    }
    var szAddon = "";
    if(sz > 0){
      var dSz = Math.floor(sz / 10.24)/100;
      szAddon = "<div class='fileEntrySize'>"+dSz+"k</div>";
    }
    var uAddon = "";
    if(u > 0){
      var uNum = u;
      if(u > 9){
        uNum = "9+";
      }
      uAddon = "<div class='fileEntryUsers' title='"+u+" users'>"+uNum+"</div>";
    }
    var styledFile = f;
    if(f.lastIndexOf("/") > 0){
      styledFile = "<div class='fileEntryDir'>"+f.substring(0, f.lastIndexOf("/")+1) +"</div> "+ f.substring(f.lastIndexOf("/")+1);
    }
    // put into type folders...
    if(fileHasExtention(f, ".js")){
      jsHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+"</div>";
    }else{
      if(fileHasExtention(f, ".css") || fileHasExtention(f, ".less") || fileHasExtention(f, ".styl")){
        cssHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+"</div>";
      }else{
        if(fileHasExtention(f, ".html")){
          htmlHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+"</div>";
        }else{
          mediaHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+"</div>";
        }
      }
    }
  }
  $("#fileBrowser_Media").html(mediaHTML);
  $("#fileBrowser_HTML").html(htmlHTML);
  $("#fileBrowser_CSS").html(cssHTML);
  $("#fileBrowser_JS").html(jsHTML);
  $(".fileEntry").disableSelection();
  $.conmenu({
      selector: ".fileEntry",
      choices: [{
        label: "<div class='rightClickCornerCut'></div>",
      },
    {
        label: "<div class='rightClickItemEl'>Duplicate</div>",
        action: function (div) {
      var fname = $(div).attr("fname");
      openShiftShiftAsDuplicate(fname);
        }
      },
    {
        label: "<div class='rightClickItemEl'>Rename</div>",
        action: function (div) {
      var fname = $(div).attr("fname");
      if(getUsersInFile(fname) <= 0){
        openShiftShiftAsRename(fname);
      }
        }
      },
    {
        label: "<div class='rightClickItemSpacer'></div>",
        action: function (div) {
      //console.log("SPACER: "+fname);
        }
      },
    {
        label: "<div class='rightClickItemEl'>Delete</div>",
        action: function (div) {
      var fname = $(div).attr("fname");
      if(getUsersInFile(fname) <= 0){
        openShiftShiftAsDelete(fname);
      }
        }
      }]
    });
  updateHUD();
}
function fileSorter_Name(a, b){
  if(a[0].toLowerCase() == b[0].toLowerCase()){
    return 0;
  }
  return (a[0].toLowerCase() > b[0].toLowerCase()) ? -1 : 1;
}
function fileSorter_Size(a, b){
  if(a[2] == b[2]){
    return 0;
  }
  return (a[2] > b[2]) ? -1 : 1;
}
function toggleFileBrowser(){
  if(fileBrowserIsOpen){
    closeFileBrowser();
  }else{
    openFileBrowser();
  }
}
function closeFileBrowser(){
  $("#fileBrowser").animate({bottom: -315}, 100);
  fileBrowserIsOpen = false;
}
function openFileBrowser(){
  $("#fileBrowser").animate({bottom: 34}, 100);
  fileBrowserIsOpen = true;
  $(document).unbind('mousedown', fileBrowserMouseDownFn);
  $(document).bind('mousedown', fileBrowserMouseDownFn);
}
function createNewFile(el){
  if($(el).html() == "New File..."){
    $(el).html("New File...<input id='newfileInputName' type='text' onkeydown='if(event.keyCode==13){createNewFileFromInputs();}if(event.keyCode==27){$(this).parent().html(\"New File...\");}'/><select id='newfileInputType'><option>.js</option><option>.css</option><option>.html</option><option>.txt</option><option>.styl</option><option>.less</option></select><input type='submit' value='ok' onclick='createNewFileFromInputs(); event.stopPropagation();' />");
    $("#newfileInputName").focus();
  }
}
function createNewFileFromInputs(){  
  var newfname = $("#newfileInputName").val().replace(/\ /g, "_").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var newftype = $("#newfileInputType").val();
  if(newfname.length > 20){
    alert("invalid file name. it's too long. :(");
    return;
  }
  $("#newfileInputName").parent().html("New File...");
  if(newfname.length == 0){
    return;
  }
  var newFilename = newfname + newftype;
  console.log("Requesting file creation: " + newFilename);
  if(newFilename != ""){
    now.s_createNewFile(newFilename, function(fname, errs){
      console.log("Created file.. any errors?");
      if(errs){
        console.log(errs);
        alert("Error creating file: "+fname+"\n\n" + errs[0]);
      }else{
        console.log("nope, no errors. :) go ahead and open it.");
        addFileToList(fname);
        openFileFromServer(fname);
        closeFileBrowser();
      }
    });
  }
}
function deleteFile(fname){
  if(getUsersInFile(fname) != 0){
    alert("cannot delete file, there are still users editing it!");
    return;
  }
  now.s_deleteFile(fname, function(fname, errs){
    if(errs && errs.length > 0){
      console.log(errs);
      alert("Error deleting file: "+fname+"\n\n" + errs[0]);
    }else{
      console.log("I just deleted the file. > " + fname);
      removeFileFromList(fname);
    }
  })
}
// ---------------------------------------------------------
// Code Folding, Cleaning, and other auto tools...
// ---------------------------------------------------------
function autoFoldCode(levelToFold){ 
  if(levelToFold == undefined){
    levelToFold = 0;
  }
  console.log("folding code at level: " + levelToFold);
  var level = 0;
  console.log("Auto Folding all code...");
  var lines = editor.getSession().getValue().split("\n");
  //console.log(lines);
  for(var r=0; r<lines.length; r++){
    // then check for functions...
    //var iFn = lines[r].indexOf("function");
    //if(iFn >= 0){
      var iBracket = lines[r].lastIndexOf("{");
      var jBracket = lines[r].lastIndexOf("}");
      var commentA  = lines[r].indexOf("//");
      if(iBracket >= 0 && iBracket > jBracket && commentA < 0){
        level++;
        if(level > levelToFold){
          // fold it!
          //console.log("Fold: row="+r+", col="+iBracket);
          var matchPos = editor.session.findMatchingBracket({row: r, column: iBracket+1});
          if(matchPos != null){
            var range = new Range(r, iBracket+1, matchPos.row, matchPos.column);
            //console.log(range);
            try {
              editor.session.addFold(" ... ", range);
            }catch(ex){
              console.log("AutoFold Exception: " + ex);
            }
            //console.log(matchPos);
            r = matchPos.row;
            continue;
          }
        }
      }else{
        if(jBracket >= 0 && iBracket < 0 && commentA < 0){
          level--;
        }
      }
    //}
  } 
  console.log("Done folding code.");
}
function autoFoldCodeProgressive(){
  autoFoldCode(2);
  autoFoldCode(1);
  autoFoldCode(0);
}
// ---------------------------------------------------------
// Shift+Shift
// ---------------------------------------------------------
var preShiftShiftFocusElement = null;
var shiftShiftMouseDownFn = function(event){
  if($(event.target).attr('id') != "shiftshift" && $(event.target).parents("#shiftshift").length == 0 && $(event.target).parents("#topMenu").length == 0){
    $(document).unbind('mousedown', shiftShiftMouseDownFn);
    closeShiftShift();
  }
}
function toggleShiftShift(){
  if($("#shiftshift").is(":visible")){
    closeShiftShift();
  }else{
    openShiftShiftAsBroadcast();
  }
}
function openShiftShift(html, height, borderColor){
  if(!$("#shiftshift").is(":visible")){
    // open it.
    preShiftShiftFocusElement = document.activeElement;
    $("#shiftshift").css({height: height, "border-color": borderColor}).html(html).show();
    $("#topMenu_CMD").addClass("topMenuItemOpen");
    $(document).unbind('mousedown', shiftShiftMouseDownFn);
    $(document).bind('mousedown', shiftShiftMouseDownFn);
  }
}
function closeShiftShift(){
  if($("#shiftshift").is(":visible")){
    // close it.
    $("#shiftshift").hide();
    $("#topMenu_CMD").removeClass("topMenuItemOpen");
    $("#shiftshiftInputDiv input").blur();
    $(preShiftShiftFocusElement).focus();
  }
}
function shiftshiftBroadcastKeydown(event){
  if(event.keyCode == 13){
    // ENTER was pressed
    var txt = $("#shiftshiftInputDiv input").val();
    if(txt != ""){
      var usedAsCommand = false;
      if(txt.length == 1){
        switch(txt.toLowerCase()){
          case "f":{
            toggleFileBrowser();
            usedAsCommand = true;
            break;
          }
          case "h":{
            toggleHUD();
            usedAsCommand = true;
            break;
          }
          case "l":{
            toggleLog();
            usedAsCommand = true;
            break;
          }
        }
      }
      if(!usedAsCommand){
        now.s_teamMessageBroadcast("personal", txt);
      }
    }
    $("#shiftshiftInputDiv input").val("");
    if(!event.shiftKey){
      toggleShiftShift();
    }
    return false;
  }
  if(event.keyCode == 27){
    // ESC was pressed
    toggleShiftShift();
    return false;
  }
  return true;
}
function shiftshiftRenameKeydown(event, fname){
  if(event.keyCode == 13){
    // ENTER was pressed
    var txt = $("#shiftshiftInputDiv input").val();
    if(txt != ""){
      if(getUsersInFile(fname) != 0){
        alert("cannot delete file, there are still users editing it!");
        return;
      }
      now.s_renameFile(fname, txt, function(fname, errs){
        if(errs && errs.length > 0){
          console.log(errs);
          alert("Error renaming file: "+fname+"\n\n" + errs[0]);
        }else{
          console.log("I just renamed the file. > " + fname);
        }
      })
    }
    $("#shiftshiftInputDiv input").val("");
    toggleShiftShift();
    return false;
  }
}
function shiftshiftDuplicateKeydown(event, fname){
  if(event.keyCode == 13){
    // ENTER was pressed
    var txt = $("#shiftshiftInputDiv input").val();
    if(txt != ""){
      if(getUsersInFile(fname) != 0){
        alert("cannot duplicate file, there are still users editing it!");
        return;
      }
      now.s_duplicateFile(fname, txt, function(fname, errs){
        if(errs && errs.length > 0){
          console.log(errs);
          alert("Error duplicating file: "+fname+"\n\n" + errs[0]);
        }else{
          console.log("I just duplicated the file. > " + fname);
        }
      })
    }
    $("#shiftshiftInputDiv input").val("");
    toggleShiftShift();
    return false;
  }
}
function shiftshiftCommitKeydown(event){
  if(event.keyCode == 13){
    // ENTER was pressed
    var txt = $("#shiftshiftInputDiv input").val();
    now.s_commitProject(txt, function(errs){
      if(errs){
        console.log(errs);
        alert("Error committing project: \n\n >> " + errs.message);
      }else{
        console.log("I just committed the project.");
      }
    });
    $("#shiftshiftInputDiv input").val("");
    toggleShiftShift();
    return false;
  }
}
function openShiftShiftAsBroadcast(){
  var html = "";
  html += "<div id='shiftshiftTitle'>BROADCAST</div>";
  html += "<div id='shiftshiftInputDiv'><input type='text' onkeydown='return shiftshiftBroadcastKeydown(event);'/></div>";
  openShiftShift(html, 90, "#00ACED");
  $("#shiftshiftInputDiv input").val("").focus();
}
function openShiftShiftAsRename(fname){
  var html = "";
  html += "<div id='shiftshiftTitle'>RENAME</div>";
  html += "<div id='shiftshiftFilename'>"+fname+" <span>to...</span></div>";
  html += "<div id='shiftshiftInputDiv'><input type='text' onkeydown='return shiftshiftRenameKeydown(event, \""+fname+"\");'/></div>";
  openShiftShift(html, 130, "#FFF100");
  setTimeout(function(){
    $("#shiftshiftInputDiv input").val(fname).focus();
  }, 50);
}
function openShiftShiftAsDuplicate(fname){
  var html = "";
  html += "<div id='shiftshiftTitle'>DUPLICATE</div>";
  html += "<div id='shiftshiftFilename'>"+fname+" <span>as...</span></div>";
  html += "<div id='shiftshiftInputDiv'><input type='text' onkeydown='return shiftshiftDuplicateKeydown(event, \""+fname+"\");'/></div>";
  openShiftShift(html, 130, "#FFF100");
  setTimeout(function(){
    $("#shiftshiftInputDiv input").val(fname).focus();
  }, 50);
}
function openShiftShiftAsDelete(fname){
  var html = "";
  html += "<div id='shiftshiftTitle'>DELETE</div>";
  html += "<div id='shiftshiftFilename'>"+fname+"</div>";
  html += "<div id='shiftshiftBtn_Cancel' class='shiftshiftBtn' onclick='closeShiftShift();'>cancel file termination</div>";
  html += "<div id='shiftshiftBtn_Delete' class='shiftshiftBtn' onclick='deleteFile(\""+fname+"\"); closeShiftShift();'>DELETE</div>"; 
  openShiftShift(html, 130, "#FF3600");
  $("#shiftshiftInputDiv input").val("").focus();
}
function openShiftShiftAsCommit(){
  var html = "";
  html += "<div id='shiftshiftTitle'>COMMIT</div>";
  html += "<div id='shiftshiftFilename'><span>Notes...</span></div>";
  html += "<div id='shiftshiftInputDiv'><input type='text' onkeydown='return shiftshiftCommitKeydown(event);'/></div>";
  openShiftShift(html, 130, "#FFF100");
  setTimeout(function(){
    $("#shiftshiftInputDiv input").val("").focus();
  }, 50);
  if(fileIsUnsaved){
    saveFileToServer();
  }
}
// ---------------------------------------------------------
// LOG and Notifications.
// ---------------------------------------------------------
var userColorMap = ["#9DDC23", "#00FFFF", "#FF308F", "#FFD400", "#FF0038", "#7C279B", "#FF4E00", "#6C8B1B", "#0A869B"];
function notifyAndAddMessageToLog(userColor, fromUserName, msg){
  var t = (new Date()).getTime();
  $("#notifications").append("<div class='notificationItem' style='border-top-color: "+userColor+";' postTime='"+t+"'><span>"+fromUserName+":</span> "+msg+"</div>");
  $("#logWindowContent").append("<div class='logItem'><div class='logItemTop' style='border-top-color: "+userColor+";'></div><span>"+fromUserName+":</span> "+msg+"</div>").stop().animate({scrollTop: ($("#logWindowContent")[0].scrollHeight - $("#logWindowContent").height())}, 250);
}
function toggleLog(){
  if($("#logWindow").is(":visible")){
    // close it.
    $("#logWindow").hide();
    $("#topMenu_LOG").removeClass("topMenuItemOpen");
  }else{
    // open it.
    $("#logWindow").show();
    $("#topMenu_LOG").addClass("topMenuItemOpen");
  }
}
// ---------------------------------------------------------
// HUD
// ---------------------------------------------------------
function toggleHUD(){
  if($("#hud").is(":visible")){
    // close it.
    $("#hud").hide();
    $("#topMenu_HUD").removeClass("topMenuItemOpen");
  }else{
    // open it.
    updateHUD();
    $("#hud").show();
    $("#topMenu_HUD").addClass("topMenuItemOpen");
  }
}
function updateHUD(){
  //console.log("updating HUD");
  var totalProjectBytes = 0;
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var fInfo = mostRecentFilesAndInfo[i];
    //if(fInfo[1] > 0){ // only show files that have users in them...
      totalProjectBytes += fInfo[2];
    //}
  }
  mostRecentFilesAndInfo.sort(fileSorter_Size);
  var remainingW = 196.0;
  var remainingH = 146.0;
  var offsetX    = 0.0
  var offsetY    = 0.0;
  var projectBytesLeft = totalProjectBytes;
  var typeIsVertical = true;
  var html = "<div id='hudData_TreeMap'>";
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var fInfo = mostRecentFilesAndInfo[i]; 
    var sz = fInfo[2];
    if(sz > 0){
      var percentSz   = 1.0*sz/projectBytesLeft;
      var maxPercentToEat = 0.4;
      var minPercentToEat = 0.02;
      //if(projectBytesLeft == sz){
      //  maxPercentToEat = 1.0;
      //}
      var pxAreaToEat = Math.max(minPercentToEat, Math.min(maxPercentToEat, percentSz)) * remainingH*remainingW;
      var blockH = 1;
      var blockW = 1;
      if(typeIsVertical){
        blockH = remainingH;
        blockW = Math.ceil(pxAreaToEat / blockH);
        //blockH = blockW; // for funky square test.
      }else{
        blockW = remainingW;
        blockH = Math.ceil(pxAreaToEat / blockW);
        //blockW = blockH; // for funky square test.
      }
      var userFlag = Math.max(0, Math.min(5, fInfo[1]));
      var plural = "";
      if(fInfo[1] != 1){
        plural = "s";
      }
      html += "<div class='treemapBlock treemapBlock_"+userFlag+"' title='"+fInfo[0]+" ("+fInfo[1]+" player"+plural+", "+(Math.floor(sz/102.4)/10.0)+"k)' style='top: "+offsetY+"px; left: "+offsetX+"px; width: "+blockW+"px; height: "+blockH+"px; line-height: "+blockH+"px; border-radius: 100px;' fname='"+fInfo[0]+"' onclick='safelyOpenFileFromEntry(this);'>"+fInfo[0]+"</div>";
      if(typeIsVertical){
        offsetX += blockW+1;
        remainingW -= blockW+1;
      }else{
        offsetY += blockH+1;
        remainingH -= blockH+1;
      }
      // switch type if needed.
      if(remainingW > remainingH){
        typeIsVertical = true;
      }else{
        typeIsVertical = false;
      }
      projectBytesLeft -= sz;
    }
  }
  html += "</div>";
  var plural = "";
  if(mostRecentTotalUserCount != 1){
    plural = "s";
  }
  html += "<div id='hudData_UserCount'>"+mostRecentTotalUserCount+" player"+plural+"</div>";
  html += "<div id='hudData_ByteCount'>"+Math.floor(totalProjectBytes/1024)+"k bytes</div>";
  $("#hudData").html(html);
  
}
// ---------------------------------------------------------
// LOG OUTPUT / CONSOLE
// ---------------------------------------------------------
function toggleLogOutput(){
  if($("#logOutput").is(":visible")){
    // close it.
    $("#logOutput").hide();
    $("#topMenu_OUT").removeClass("topMenuItemOpen");
  }else{
    // open it.
    $("#logOutput").show();
    $("#topMenu_OUT").addClass("topMenuItemOpen");
  }
}
// ---------------------------------------------------------
// Launch!
// ---------------------------------------------------------
function launchProject(){
  console.log("Attempting to launch project...");
  now.s_deployProject("Generic Launch", function(err, launchURL){
    if(err){
      console.log(err[0]);
      return;
    }else{
      console.log("Launch successful! >> URL="+launchURL);
      window.open(launchURL,'CHAOS_APP_LAUNCH_'+pageLoadID);
    }
  });
} 
// ---------------------------------------------------------
// URL manipulation.
// ---------------------------------------------------------
function renameMyself(){
  setName(prompt("What shall we call thee?"));
  now.s_sendUserEvent("join"); // let everyone know who I am!
}
function setName(newName){
  now.name = newName;
  $("#whoIAm").html("//  Hello, <b style='cursor: pointer;' onclick='renameMyself();'>"+now.name+"</b>.");
}
// ---------------------------------------------------------
// URL manipulation.
// ---------------------------------------------------------
function getURLGetVariable(variable) { 
  var query = window.location.search.substring(1); 
  var vars = query.split("&"); 
  for (var i=0;i<vars.length;i++) { 
    var pair = vars[i].split("="); 
    if (pair[0].toLowerCase() == variable.toLowerCase()) { 
      return pair[1]; 
    } 
  }
  return null;
}
function setURLHashVariable(variable, value){
  var newQuery = "";
  var replacedExistingVar = false;
  var query = window.location.hash.substring(1); 
  console.log(query);
  var vars = query.split("&"); 
  for (var i=0;i<vars.length;i++) { 
    if(vars[i] == ""){
      continue;
    }
    var pair = vars[i].split("="); 
    if (pair[0].toLowerCase() == variable.toLowerCase()) { 
      pair[1] = value;
      console.log("replaced value: " + pair[0]);
      replacedExistingVar = true;
    } 
    newQuery += pair[0] + "=" + pair[1]; 
    if(i < vars.length-1){
      newQuery += "&";
    }
  }
  if(!replacedExistingVar){
    if(newQuery.length > 0){
      newQuery += "&";
    }
    newQuery += variable + "=" + value;
  }
  window.location.hash = newQuery;
}
function getURLHashVariable(variable){
  var query = window.location.hash.substring(1); 
  var vars = query.split("&"); 
  for (var i=0;i<vars.length;i++) { 
    if(vars[i] == ""){
      continue;
    }
    var pair = vars[i].split("="); 
    if (pair[0].toLowerCase() == variable.toLowerCase()) { 
      return pair[1];
    } 
  }
  return null;
}
// ---------------------------------------------------------
// READY! :)
// ---------------------------------------------------------
var alreadyConnected = false;
now.ready(function(){
  if(alreadyConnected){
    // seeing ready after already being connected.. assume server was reset!
    alert("server was reset.");
    window.location.reload();
  }
  nowIsOnline = true;
  alreadyConnected = true; 
  console.log("Using NowJS -- this clientId: " + now.core.clientId); 
  now.s_sendUserEvent("join"); // let everyone know who I am!
  setInterval(ifOnlineLetCollaboratorsKnowImHere, TIME_UNTIL_GONE/3);
  var specifiedFileToOpen = getURLHashVariable("fname");
  if(specifiedFileToOpen){
    openFileFromServer(specifiedFileToOpen, true);
  }else{
    openFileFromServer("app.js", true);
  }
  now.s_getAllProjectsFiles(function(err, filesAndInfo){
    updateFileBrowserFromFileList(filesAndInfo);
  });
  now.core.on('disconnect', function () {
    console.log("DISCONNECT... Setting nowIsOnline to false"); // this.user.clientId
    nowIsOnline = false;
    setFileStatusIndicator("offline");
  });
  now.core.on('connect', function () {
    console.log("CONNECT... Setting nowIsOnline to true"); // this.user.clientId
    nowIsOnline = true;
    setFileStatusIndicator("default");
  });
  console.log(now);
  setName(now.name);
  setTimeout(function(){
    $("#logOutputIFrame").attr("src", "http://logs.chaoscollective.org/live?log="+now.teamID); 
    document.title = now.teamID;
  }, 1000);
  console.log("fetching git commits...");
  now.s_fetchProjectCommits(function(commits){
    console.log(" -- returned from git commit fetch --");
    console.log(commits);
    var cHTML = "";
    for(var i=commits.length-1; i>=0; i--){
      var c = commits[i];
      cHTML += "<br/><div style='opacity: 0.8; padding-lefT: 20px; font-style: italic;'>"+c.time_relative+"</div><div style='padding-left: 20px; color: #090; width: 40px; display: inline-block; text-align: right;'>+"+c.linesAdded+"</div> <div style='color: #900; width: 40px; display: inline-block;'>-"+c.linesDeleted+"</div><div class='itemType_projectAction'>"+c.comment+"</div><div style='clear: both;'></div>";
    }
    notifyAndAddMessageToLog("#CCCCCC", "CHAOS", "Most recent commits "+cHTML); 
    console.log(" ------------------------------------");
  });
  //toggleHUD();
});
$(window).ready(function() {
  
  //now.name = prompt("What's your name?").replace(/\&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  var getName = getURLGetVariable("name");
  if(!getName){
    getName = "#"+Math.floor(Math.random()*10000);
  }
  now.name = getName;
  
  var getProject = getURLGetVariable("project");
  if(getProject){
    now.teamID = getProject;
  }else{
    now.teamID = '';
  }
  
  $("#whoIAm").html("Authenticating...");
  
    editor = ace.edit("editor");
  editor.setTheme("ace/theme/chaos");
  console.log("EDITOR");
  console.log(editor);

  editor.getSession().setTabSize(2);
  editor.getSession().setUseSoftTabs(true);
  editor.setHighlightActiveLine(false);
  editor.setShowPrintMargin(false);

  editor.getSession().setUseWrapMode(true);
  editor.getSession().setWrapLimitRange(null, null);
  editor.setScrollSpeed(8);
  
  /*
  console.log(editor.commands);
  var canon = require('pilot/canon');
  */
  editor.commands.addCommand({
      name: 'saveToServer',
      bindKey: {
          win: 'Ctrl-S',
          mac: 'Command-S',
          sender: 'editor'
      },
      exec: function(env, args, request) {
      if(!nowIsOnline){
        return;
      }
      openShiftShiftAsCommit();
      }
  });
  editor.commands.addCommand({
    name: 'autoFoldAllCode',
    bindKey: {
      win: 'Alt-f',
      mac: 'Alt-f',
      sender: 'editor'
    },
    exec: function(env, args, request) {
      autoFoldCodeProgressive();
    }
  });
  /*
  editor.commands.addCommand({
      name: 'removeBlankLines_TightenUp',
      bindKey: {
          win: 'Alt-t',
          mac: 'Alt-t',
          sender: 'editor'
      },
      exec: function(env, args, request) {
      if(!nowIsOnline){
        return;
      }
      var txt = editor.getSession().getValue();
      txt = txt.replace(/\n\n/g, "\n");
      editor.getSession().setValue(txt);
      }
  });
  */

  editor.getSession().on('change', function(a, b, c){
    if(!ignoreAceChange){
      if(textChangeTimeout != null){
        clearTimeout(textChangeTimeout);
        textChangeTimeout = null;
      }else{
        setFileStatusIndicator("changed");
      }
      timeOfLastLocalKepress = (new Date()).getTime();
      textChangeTimeout = setTimeout(function(){
        if(!nowIsOnline){
          return;
        }
        sendTextChange();
      }, 350);
    }
  });
  
  editor.getSession().selection.on('changeCursor', function(a){
    var range = editor.getSelectionRange();
    if(cursorChangeTimeout != null){
      clearTimeout(cursorChangeTimeout);
      cursorChangeTimeout = null;
    }
    cursorChangeTimeout = setTimeout(ifOnlineLetCollaboratorsKnowImHere, 350);
  });
  
  editor.getSession().setFoldStyle("markbeginend");
  
  console.log("starting...");
  
  setInterval(ifOnlineVerifyCollaboratorsAreStillHere_CleanNotifications_AutoSave, 1000);
   
  var lastShiftTime = 0;
  var SHIFT_SHIFT_THRESH = 300;
  $(document).keydown(function(event){
    if(event.shiftKey && event.keyCode == 16){
      var t = (new Date()).getTime();
      if((t-lastShiftTime) < SHIFT_SHIFT_THRESH){
        t = 0;
        // SHIFT+SHIFT!
        toggleShiftShift();
      }
      lastShiftTime = t;
    }else{
      lastShiftTime = 0;
    }
  });
  $("#top").disableSelection();
  
  //if(Math.abs(screen.width-window.innerWidth) > 20 || Math.abs(screen.height-window.innerHeight) > 20) {
  //  document.body.webkitRequestFullScreen(true);
  //}
  //$("body")[0].webkitRequestFullScreen(true);
  //document.documentElement.webkitRequestFullScreen(true);
  
  /*
  setTimeout(function(){
    console.log("setting theme to tiny.");
    $("#editor").css({"line-height": "1px"});
    editor.setTheme("ace/theme/chaostiny");
    setTimeout(function(){
      console.log("setting theme to normal.");
      $("#editor").css({"line-height": "12px"});
      editor.setTheme("ace/theme/chaos");
    }, 3000);
  }, 8000);
  */
  
  setTimeout(function(){
    console.log("editor theme hack to ensure painting...");
    editor.setTheme("ace/theme/chaos");
  }, 100);
});




