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
// ---------------------------------------------------------
// Main functions...
// ---------------------------------------------------------
function fileHasExtention(f, ext){
  return ((f.indexOf(ext) > 0 && f.indexOf(ext) == f.length-ext.length));
}
// ----------------------------------------------------------
var mostRecentFilesAndInfo   = [];
var mostRecentTotalUserCount = 1;
function safelyOpenFileFromEntry(el){
  var fname = $(el).attr('fname');
  if(fname != undefined && fname != null && fname != ""){
    console.log("SAFELY OPENING FILE: " + fname);
    console.log("TODO: make sure file is saved before opening over it...");
    var divToPopulate = $(".paneScreenSelected");
    if(divToPopulate.length > 0){
      divToPopulate = $(divToPopulate[0]).parents(".editPane");
      console.log(divToPopulate);
      populateEditPane(divToPopulate, fname);
    }
    closeFileBrowser();
  }else{
    console.log("output log disabled for demo.");
    return;
    console.log("Undefined filename... showing log.");
    var divToPopulate = $(".paneScreenSelected");
    if(divToPopulate.length > 0){
      divToPopulate = $(divToPopulate[0]).parents(".editPane");
      console.log(divToPopulate);
      populateEditPane(divToPopulate, "");
    }
    closeFileBrowser();
  }
}
function populateEditPane(editPane, fname){
  if(fname){
    $(editPane).html("<iframe src='/editFile.html?project="+PROJECT+"#fname="+fname+"'></iframe><div class='paneScreen' onmousedown='selectPaneScreen(this);'></div>");
  }else{
    $(editPane).html("<iframe src='http://logs.chaoscollective.org/live?log="+PROJECT+"'></iframe><div class='paneScreen' onmousedown='selectPaneScreen(this);'></div>");
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
function getProjectFileInfo(fname){
  for(var i=0; i<mostRecentFilesAndInfo.length; i++){
    var f = mostRecentFilesAndInfo[i];
    if(f[0] == fname){
      return f;
    }
  }
  return null;
}
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
    var f  = fInfo[0] || 0;
    var u  = fInfo[1] || 0;
    var sz = fInfo[2] || 0;
    var td = fInfo[3] || 0;
    var fm = fInfo[4] || 0;
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
    var tdAddon = "";
    if(td > 0){
      tdAddon = "<div class='fileEntryTD' title='"+td+" TO"+"DO' style='height: "+Math.min(16, 1+td)+"px;'></div>";
    }
    var fmAddon = "";
    if(fm > 0){
      fmAddon = "<div class='fileEntryFM' title='"+fm+" FIX"+"ME' style='height: "+Math.min(16,1+fm)+"px;'></div>";
    }
    var styledFile = f;
    if(f.lastIndexOf("/") > 0){
      styledFile = "<div class='fileEntryDir'>"+f.substring(0, f.lastIndexOf("/")+1) +"</div> "+ f.substring(f.lastIndexOf("/")+1);
    }
    // put into type folders...
    if(fileHasExtention(f, ".js")){
      jsHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+tdAddon+fmAddon+"</div>";
    }else{
      if(fileHasExtention(f, ".css") || fileHasExtention(f, ".less") || fileHasExtention(f, ".styl")){
        cssHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+tdAddon+fmAddon+"</div>";
      }else{
        if(fileHasExtention(f, ".html")){
          htmlHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+tdAddon+fmAddon+"</div>";
        }else{
          mediaHTML += "<div class='fileEntry' onclick='safelyOpenFileFromEntry(this);' fname='"+f+"'>"+styledFile+uAddon+szAddon+tdAddon+fmAddon+"</div>";
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
  $(".paneScreen").hide();
}
function openFileBrowser(){
  var origActive = document.activeElement;
  console.log(origActive);
  var putFileInPane = $("#pane_0");
  var epane = $(origActive).parents(".editPane");
  if(epane && epane.length > 0){
    putFileInPane = epane;
  }
  $(".paneScreen").removeClass("paneScreenSelected").show();
  putFileInPane.children(".paneScreen").addClass("paneScreenSelected");
  $("#fileBrowser").animate({bottom: 34}, 100);
  fileBrowserIsOpen = true;
  $(document).unbind('mousedown', fileBrowserMouseDownFn);
  $(document).bind('mousedown', fileBrowserMouseDownFn);
  setTimeout(loadAllProjectFiles, 50);
}
function selectPaneScreen(p){
  $(".paneScreen").removeClass("paneScreenSelected").show();
  $(p).addClass("paneScreenSelected");
  event.stopPropagation();
}
function createNewFile(el){
  if($(el).html() == "New File..."){
    $(el).html("New File...<input id='newfileInputName' type='text' onkeydown='if(event.keyCode==13){createNewFileFromInputs();}if(event.keyCode==27){$(this).parent().html(\"New File...\");}'/><select id='newfileInputType'><option>.js</option><option>.json</option><option>.css</option><option>.html</option><option>.txt</option><option>.styl</option><option>.less</option></select><input type='submit' value='ok' onclick='createNewFileFromInputs(); event.stopPropagation();' />");
    $("#newfileInputName").focus();
  }
}
function createNewFileFromInputs(){  
  var newfname = $("#newfileInputName").val().replace(/\ /g, "_").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var newftype = $("#newfileInputType").val();
  if(newfname.length > 40){
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
    $.post("/createFile?project="+PROJECT, {fname: newFilename}, function(data){
      if(data && data.indexOf("FAIL") !== 0){
        shoutCreatedFile(data);
      }else{
        alert("failed to create new file.");
      }
    });
  }
}
function deleteFile(fname){
  $.post("/deleteFile?project="+PROJECT, {fname: fname}, function(data){
    if(data && data.indexOf("FAIL") !== 0){
      console.log("I just deleted the file. > " + fname);
      shoutDeletedFile(data);
    }else{
      alert("failed to delete file: "+fname);
    }
  });
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
          case "l":{
            toggleLog();
            usedAsCommand = true;
            break;
          }
          case "o":{
            toggleLogOutput();
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
// -------------
function shiftshiftRenameKeydown(event, fname){
  if(event.keyCode == 13){
    // ENTER was pressed
    var txt = $("#shiftshiftInputDiv input").val();
    if(txt != ""){
      $.post("/renameFile?project="+PROJECT, {fname: fname, newfname: txt}, function(data){
        if(data && data.indexOf("FAIL") !== 0){
          console.log("I just renamed the file. > " + fname + " to " + data);
          shoutRenamedFile(fname, data);
        }else{
          alert("failed to rename file: "+fname);
        }
      });
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
      $.post("/duplicateFile?project="+PROJECT, {fname: fname, newfname: txt}, function(data){
        if(data && data.indexOf("FAIL") !== 0){
          console.log("I just duplicated the file. > " + fname + " to " + data);
          shoutDuplicatedFile(fname, data);
        }else{
          alert("failed to duplicate file: "+fname);
        }
      });
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
  alert("FAIL: Sorry but committing projects is currently disabled.");
  return;
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
  $.post("/launchProject?project="+PROJECT, function(data){
    if(data && data.indexOf("FAIL") !== 0){
      shoutLaunchedProject();
    }else{
      alert(data); //"failed to launch project.");
    }
  });
}
function loadAllProjectFiles(tryToLoadFirstFiles){
  $.get("/allProjectFiles?project="+PROJECT, function(data){
    if(data){
      try{
        var filesAndInfo = JSON.parse(data);
        updateFileBrowserFromFileList(filesAndInfo);
        // first time only, check if index.less exists: otherwise, fallback to index.css.
        if(tryToLoadFirstFiles){
          console.log("-- trying to load first file for pane 0 --");
          if(!getProjectFileInfo("public/index.less")){
            if(getProjectFileInfo("public/index.css")){
              populateEditPane($("#pane_0"), "public/index.css");
            }else{
              if(getProjectFileInfo("public/index.html")){
                populateEditPane($("#pane_0"), "public/index.html");
              }else{
                if(getProjectFileInfo("_project.json")){
                  populateEditPane($("#pane_0"), "_project.json");
                }else{
                  console.log("-- no file seems suitable for initial pane 0 --");
                }
              }
            }
          } 
        }
      }catch(ex){
        console.log("JSON fail?");
        console.log(ex);
      }
    }else{
      console.log("ERROR: couldn't fetch project file data.");
      console.log(data);
    }
  });
}
// ---------------------------------------------------------
// Shout
// ---------------------------------------------------------
function shoutLaunchedProject(){
  console.log("TODO: shout that project has been launched.");
}
function shoutCreatedFile(fname){
  loadAllProjectFiles();
  closeFileBrowser();
  var divToPopulate = $(".paneScreenSelected");
  if(divToPopulate.length > 0){
    divToPopulate = $(divToPopulate[0]).parents(".editPane");
    console.log(divToPopulate);
    populateEditPane(divToPopulate, fname);
  }
  console.log("TODO: shout that file was created >> "+fname);
}
function shoutDeletedFile(fname){
  loadAllProjectFiles();
  console.log("TODO: shout that file was deleted >> "+fname);
}
function shoutRenamedFile(fname, newfname){
  loadAllProjectFiles();
  console.log("TODO: shout that file was renamed >> "+fname+" to "+newfname);
}
function shoutDuplicatedFile(fname, newfname){
  loadAllProjectFiles();
  console.log("TODO: shout that file was duplicated >> "+fname+" to "+newfname);
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
function setupJoin(j){
  var join = j;
  var isLR = true;
  if(!$(join).hasClass("joinLR")){
    isLR = false;
  }
  var divScreen = $(join).children(".divScreen");
  if(isLR){
    var divLeft  = $(join).children(".joinLeft");
    var divRight = $(join).children(".joinRight");
    var divBar   = $(join).children(".divLR");
    function updateLR(){
      var p = divBar.position();
      divRight.css({left: (p.left+divBar.width())+"px"});
      divLeft.css({width: (p.left)+"px"});
    }
    updateLR();
    $(divBar).draggable({
      axis: "x",
      containment: join,
      iframeFix: true,
      start: function(event, ui) {
        divScreen.show();
        updateLR();
      },
      drag: function(event, ui) {
        updateLR();
      },
      stop: function(event, ui) {
        updateLR();
        divScreen.hide();
      }
    });
  }else{
    var divTop    = $(join).children(".joinTop");
    var divBottom = $(join).children(".joinBottom");
    var divBar    = $(join).children(".divTB");
    function updateTB(){
      var p = divBar.position();
      divBottom.css({top: (p.top+divBar.height())+"px"});
      divTop.css({height: (p.top)+"px"});
    }
    updateTB();
    $(divBar).draggable({
      axis: "y",
      containment: join,
      iframeFix: true,
      start: function(event, ui) {
        divScreen.show();
        updateTB();
      },
      drag: function(event, ui) {
        updateTB();
      },
      stop: function(event, ui) {
        updateTB();
        divScreen.hide();
      }
    });
  }
}
// ---------------------------------------------------------
// READY! :)
// ---------------------------------------------------------
var PROJECT = "SandboxApp";
$(window).ready(function() {
  var getProject = getURLGetVariable("project");
  if(getProject){
   PROJECT = getProject;
  }
  document.title = PROJECT;
  populateEditPane($("#pane_0"), "public/index.less");
  populateEditPane($("#pane_1"), "app.js");
  //populateEditPane($("#pane_2"), "");
  populateEditPane($("#pane_2"), "public/index.js"); 
  
  $(".join").each(function(index, el){
    setupJoin(el);
  });
  
  loadAllProjectFiles(true);
  
  var lastShiftTime = 0;
  /*
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
  */
  
  setTimeout(function(){alert("\nWelcome to Space!\n\nSpace is a real-time, collaborative code editor created by the Chaos Collective.\n\nWhen other users are online, you'll see their cursors directly in the code. Click the button at the bottom left to open the file browser and see where users are.\n\nGo forth, explore Space, and write some code with your friends!")}, 5000);
});




