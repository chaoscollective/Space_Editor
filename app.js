//
// SERVER-SIDE
//
// Node.JS! :)
//
//var profiler = require("v8-profiler");
console.log("\n** Starting Node service **");
var express = require("express"); //"-unstable");
var util    = require("util");
var fs      = require('fs');
var crypto  = require('crypto');
var walk    = require('walk');
var spawn   = require('child_process').spawn;
var exec    = require('child_process').exec;
var gzippo  = require('gzippo');
//var stylus  = require('stylus');

var app = express.createServer(); 
//app.use(express.static(__dirname + '/public'));
var staticProvider = gzippo.staticGzip(__dirname + '/public'); // use GZIP compression for static files (cache ~1 day)!
app.use(staticProvider);
app.get('/',function(req,res,next){
  console.log(staticProvider);
  req.url = "index.html";
  staticProvider(req, res, next);
});
//app.use(stylus.middleware({src: __dirname + '/public', dest: __dirname + '/public', debug: true}));
//app.use(express.methodOverride()); 
var port = process.env.PORT || 3141;
app.listen(port); 
 
var thisAppDirName = __dirname.substring(__dirname.lastIndexOf("/")+1);

var teamID = "EditorDev";
if(teamID == thisAppDirName) {
  teamID = "Sandbox";
}

var localFileIsMostRecent = []; // an array of flags indicating if the file has been modified since last save.
var nowjs = require("now");
var everyone = nowjs.initialize(app);
nowjs.on('connect', function () { 
  console.log("CONNECT    > " + this.user.clientId);
  //console.log(this.user); // just clientId and cookies.
  //console.log(this.socket);
  //console.log(this.now.name);
  this.user.teamID      = teamID;
  if(this.now.teamID != ''){
    this.user.teamID = this.now.teamID;
  }
  console.log(" >> PROJECT="+this.user.teamID);
  this.user.grouplist   = []; // file groups starts out empty.
  this.user.about       = [];
  this.user.about.name  = "Default Username";
  this.user.about.email = "default@chaos.org";
  addUserToFileGroup(this.user, ""); // the blank file group is the the team group.
  this.now.c_confirmProject(this.user.teamID);
});
nowjs.on('disconnect', function () {
  //console.log("DISCONNECT > "+this.user.clientId+" >> "+this.user.about.name+" <"+this.user.about.email+">"); 
  console.log("DISCONNECT > "+this.user.clientId+" >> "+this.now.name); 
  var teamgroup  = nowjs.getGroup(this.user.teamID);
  // remove user from all file groups.
  if(this.user.grouplist !== undefined){
    for(var i=0; i<this.user.grouplist.length; i++){
      var g = this.user.grouplist[i];
      var fname = g.substring(g.indexOf("_")+1);
      usersInGroupMinusMinus(g);
      teamgroup.now.c_processUserFileEvent(fname, "leaveFile", this.user.clientId, usersInGroup[g]);
    }
  }
  // finally, remove the user from the team group. (don't need this now since team is also in user.grouplist)
  teamgroup.now.c_processUserEvent("leave", this.user.clientId, this.now.name);
});
//
// NOW: Remote collab messages.
//
everyone.now.s_sendCursorUpdate = function(fname, range, changedByUser){
  var userObj = this.user;
  var filegroup = nowjs.getGroup(userObj.teamID+fname);
  filegroup.now.c_updateCollabCursor(this.user.clientId, this.now.name, range, changedByUser);
};
everyone.now.s_sendDiffPatchesToCollaborators = function(fname, patches, crc32){
  var userObj = this.user;
  localFileIsMostRecent[userObj.teamID+fname] = false; // mark file as changed.
  var filegroup = nowjs.getGroup(userObj.teamID+fname);
  filegroup.now.c_updateWithDiffPatches(this.user.clientId, patches, crc32);
};
everyone.now.s_requestFullFileFromUserID = function(fname, id, fileRequesterCallback){
  var callerID = this.user.clientId;
  var userObj = this.user;
  var filegroup = nowjs.getGroup(userObj.teamID+fname);
  filegroup.hasClient(id, function (bool) {
    if (bool) {
      console.log("requesting full file. valid filegroup. :)");
      nowjs.getClient(id, function(){
        if(this.now === undefined){
          console.log("Undefined clientId for requestFullFileFromUserID >> " + id);
        }else{
          this.now.c_userRequestedFullFile(fname, callerID, fileRequesterCallback);
        }
      });
    }
  });
};
everyone.now.s_teamMessageBroadcast      = function(type, message){
  var teamgroup  = nowjs.getGroup(this.user.teamID);
  var scope      = "team";
  var fromUserId = this.user.clientId;
  var fromUserName = this.now.name;
  teamgroup.now.c_processMessage(scope, type, message, fromUserId, fromUserName);
};
everyone.now.s_leaveFile                 = function(fname){
  var teamgroup  = nowjs.getGroup(this.user.teamID);
  var fromUserId = this.user.clientId;
  removeUserFromFileGroup(this.user, fname);
};
everyone.now.s_sendUserEvent             = function(event){
  var teamgroup  = nowjs.getGroup(this.user.teamID);
  var fromUserId = this.user.clientId;
  var fromUserName = this.now.name;
  teamgroup.now.c_processUserEvent(event, fromUserId, fromUserName);
};
//
// NOW: Remote file tools.
//
everyone.now.s_getLatestFileContentsAndJoinFileGroup = function(fname, fileRequesterCallback){
  var callerID = this.user.clientId;
  var userObj = this.user;
  addUserToFileGroup(userObj, fname);
  //removeUserFromAllFileGroupsAndAddToThis(origUser, fname);
  if(localFileIsMostRecent[userObj.teamID+fname] === true || localFileIsMostRecent[userObj.teamID+fname] === undefined){
    localFileFetch(userObj, fname, fileRequesterCallback);
    console.log("FILE FETCH: " + userObj.teamID + " >> " + fname + ", by user: " + callerID);
  }else{
    console.log("FILE FETCH (passed to user): " + userObj.teamID + " >> " + fname + ", by user: " + callerID);
    var filegroup = nowjs.getGroup(userObj.teamID+fname);
    var users = filegroup.getUsers(function (users) {
      var foundUser = false;
      for (var i = 0; i < users.length; i++){ 
        if(users[i] != callerID){
          // this looks like a valid user to get the file from. :)
          console.log("Trying to get file from: " + users[i]);
          nowjs.getClient(users[i], function(){
            if(this.now === undefined){
              console.log("Undefined clientId for requestFullFileFromUserID (using local) >> " + users[i]);
              localFileFetch(userObj, fname, fileRequesterCallback);
            }else{
              this.now.c_userRequestedFullFile(fname, callerID, fileRequesterCallback);
            }
          });
          foundUser = true;
          break;
        }
      }
      if(!foundUser){
        console.log("Flagged as changed, but no user with file: "+userObj.teamID+" >> "+fname+" >> FETCHING last saved.");
        localFileFetch(userObj, fname, fileRequesterCallback);
      }
    });
  }
};
everyone.now.s_saveUserFileContentsToServer = function(fname, fcontents, fileSaverCallback){
  localFileSave(this.user, fname, fcontents, fileSaverCallback);
};
everyone.now.s_getAllProjectsFiles = function(callback){
  var team = this.user.teamID;
  var projectRoot = "/NETFS/"+team;
  var walker = walk.walk(projectRoot, {followLinks: false});
  var filesAndInfo = [];
  walker.on("names", function (root, nodeNamesArray) {
    // use this to remove/sort files before doing the more expensive "stat" operation.
    //console.log(root + " / " + nodeNamesArray);
    for(var i=nodeNamesArray.length-1; i>=0; i--){
      if(nodeNamesArray[i] == ".git" || nodeNamesArray[i] == "node_modules"){
        nodeNamesArray.splice(i, 1);
      }
    }
  });
  walker.on("file", function (root, fileStats, next) {
    var rt = root.substring(projectRoot.length+1);
    if(rt.length > 0){
      rt += "/";
    }
    var fname = rt + fileStats.name;
    var sz = fileSizeCache[team+fname];
    if(sz === undefined){
      // first time checking files size.. get it!
      sz = fileStats.size;
      fileSizeCache[team+fname] = sz;
    }
    var n = usersInGroup[team+fname];
    if(n){
      filesAndInfo.push([fname, n, sz]);
    }else{
      filesAndInfo.push([fname, 0, sz]);
    }
    next();
  });
  walker.on("end", function() {
    console.log("Recursively listed project files for: " + team);
    // indicate total team members online.
    var n = usersInGroup[team];
    if(n){
      filesAndInfo.push(["", n]);
    }else{
      filesAndInfo.push(["", 0]);
    }
    callback(null, filesAndInfo);
  });
};
everyone.now.s_createNewFile = function(newFilename, fileCreatorCallback){
  localFileCreate(this.user, newFilename, fileCreatorCallback);
};
everyone.now.s_deleteFile    = function(fname, fileDeleterCallback){
  var usersInFile = usersInGroup[this.user.teamID+fname];
  if(usersInFile === undefined || usersInFile === 0){
    localFileDelete(this.user, fname, fileDeleterCallback);
  }else{
    console.log("Cannot delete file. There are users in it! " + this.user.teamID+" >> "+fname);
    fileCallback(fname, ["Cannot delete file. There are users in it!"]);
  }
};
everyone.now.s_renameFile    = function(fname, newFName, fileRenamerCallback){
  var usersInFile = usersInGroup[this.user.teamID+fname];
  if(usersInFile === undefined || usersInFile === 0){
    localFileRename(this.user, fname, newFName, fileRenamerCallback);
  }else{
    console.log("Cannot rename file. There are users in it! " + this.user.teamID+" >> "+fname);
    fileCallback(fname, ["Cannot rename file. There are users in it!"]);
  }
};
everyone.now.s_duplicateFile = function(fname, newFName, fileDuplicatorCallback){
  localFileDuplicate(this.user, fname, newFName, fileDuplicatorCallback);
};
everyone.now.s_commitProject = function(txt, committerCallback){
  var team = this.user.teamID;
  console.log("committing project... >> " + team);
  var teamProjGitPath = '/NETFS/'+team;
  // this only needs done when a new repo is created...
  //localRepoInitBare(teamProjGitPath, function(err){});
  localRepoCommit(this.user, teamProjGitPath, txt, function(err){
    if(err) { 
       console.log(err);
    }
    committerCallback(err);
  });
};
everyone.now.s_fetchProjectCommits = function(fetcherCallback){
  var team = this.user.teamID;
  console.log("fetching project commits... >> " + team);
  var teamProjGitPath = '/NETFS/'+team;
  localRepoFetchGitLog(this.user, teamProjGitPath, "", function(err){
    if(err) { 
       console.log(err);
    }
    fetcherCallback(err);
  });
};
everyone.now.s_deployProject = function(txt, deployerCallback){
  var team = this.user.teamID;
  console.log("DEPLOYING Project >> " + team);
  localProjectDeploy(this.user, deployerCallback);
};
//
// Git Repository management stuff.
//
function localRepoInitBare(gitRepoPath, callback){
  var child = exec('git init', { 
    encoding: 'utf8', 
    timeout: 30000, 
    maxBuffer: 200*1024, 
    killSignal: 'SIGTERM',
    cwd: gitRepoPath, 
    env: null
  }, function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
      }
    console.log("GIT: Init >> " + gitRepoPath);
    callback(error);
  });
}
function localRepoCommit(userObj, gitRepoPath, message, callback){
  var safeMsg        = Utf8.encode(message).replace(/\"/g, "\\\"");
  var authString     = userObj.about.name+" <"+userObj.about.email+">";
  var safeAuthString = Utf8.encode(authString).replace(/\"/g, "\\\"");
  console.log("GIT: Commit to  >> "+gitRepoPath+" by: "+safeAuthString);
  var child = exec('git add .; git commit -a --allow-empty --allow-empty-message --author=\"'+safeAuthString+'\" -m \"'+safeMsg+'\";', { 
    encoding: 'utf8', 
    timeout: 30000, 
    maxBuffer: 200*1024, 
    killSignal: 'SIGTERM',
    cwd: gitRepoPath, 
    env: null
  }, function (error, stdout, stderr) {
    if (error !== null) {
        console.log('exec error: ' + error);
      }else{
      // success! notify team members.
      var teamgroup  = nowjs.getGroup(userObj.teamID);
      var fromUserId = userObj.clientId;
      teamgroup.now.c_processUserFileEvent("", "commitProject", fromUserId, 0, "", safeMsg);
    }
    callback(error);
  });
}
function localRepoFetchGitLog(userObj, gitRepoPath, fname, fetcherCallback) {
  // TODO: Make the filtering part of the git command, not an after thought with a ton of results.
  // Seeing all checkpoints since the beginning of a project could lead to looking at many thousand results...
  var authString      = userObj.about.name+" <"+userObj.about.email+">";
  var safeAuthString  = Utf8.encode(authString).replace(/\"/g, "\\\"");
  var maxInitialFetch = 10; // hardcoded max value so things don't get crazy until it's explicitly part of the git command...    
  var maxResults      = 5;
  var saveThisEntry   = false;
  var filter          = null;
  console.log("GIT: Commit to  >> "+gitRepoPath+" by: "+safeAuthString);
  var cmd = "git log -n"+maxInitialFetch+" --numstat --pretty=format:\"commit  %H%naname   %an%namail   %ae%nrdate   %ar%nutime   %at%ncnote   %s\" -- "+fname;
  console.log(cmd);
  var child = exec(cmd, { 
    encoding: 'utf8', 
    timeout: 30000, 
    maxBuffer: 200*1024, 
    killSignal: 'SIGTERM',
    cwd: gitRepoPath, 
    env: null
  }, 
  function (error, stdout, stderr) {
    if (error !== null) {
      console.log('exec error: ' + error);
      callback(error, null);
    }else{
      // success! notify team members.
      var teamgroup  = nowjs.getGroup(userObj.teamID);
      var fromUserId = userObj.clientId;
      //teamgroup.now.c_processUserFileEvent("", "commitProject", fromUserId, 0, "", safeMsg);
      console.log("***** STD OUT *****");
      var logLines = stdout.split("\n");
      //console.log(logLines);
      var out = [];
      for(var i=0; i<logLines.length; i++){
        var line = logLines[i];
        if(line.indexOf("commit") == 0){
          // new entry.. first check if we've hit max entries
          if(out.length >= maxResults){
            break;
          }
          out.push({}); // start a new array
          out[out.length-1]['commit'] = line.substring(8);
          saveThisEntry = true;
        }
        if(saveThisEntry){
          if(line.indexOf("aname") == 0){
            out[out.length-1]['auth_name'] = line.substring(8);
          }
          if(line.indexOf("amail") == 0){
            out[out.length-1]['auth_email'] = line.substring(8);
          }
          if(line.indexOf("rdate") == 0){
            out[out.length-1]['time_relative'] = line.substring(8);
          }
          if(line.indexOf("utime") == 0){
            out[out.length-1]['time_epoch'] = line.substring(8);
          }
          if(line.indexOf("cnote") == 0){
            var comment = line.substring(8);
            out[out.length-1]['comment'] = comment;
            if(filter != null){
              if(comment.indexOf(filter) < 0){
                out.pop();
                saveThisEntry = false;
              }
            }
          }
          if(line.length > 0 && !isNaN(line.charAt(0)) ){
            //echo "numeric line.. counting changes!\n";
            var numArray = line.split("\t");
            if(numArray.length >= 2 && !isNaN(numArray[0]) && !isNaN(numArray[1]) && numArray[0] != "-" && numArray[1] != "-"){
              out[out.length-1]['linesAdded']   = numArray[0];
              out[out.length-1]['linesDeleted'] = numArray[1];
            }
          }
        }
      }
      console.log(out);
      fetcherCallback(out);
    }
  });
}
//
// group management stuff.
//
var usersInGroup = [];
function addUserToFileGroup(userObj, fname){
  var groupname = userObj.teamID + fname;
  //console.log("ADD TO GROUP: " + groupname);
  //console.log("        team: " + userObj.teamID);
  //console.log("       fname: " + fname);
  var g = nowjs.getGroup(groupname);
  if(!g.users[userObj.clientId]){
    // user not in group yet.
    // add to NOW group.
    g.addUser(userObj.clientId);
    // add to local group.
    userObj.grouplist.push(groupname);
    // keep track locally of users in group.
    usersInGroupPlusPlus(groupname);
    if(fname.length > 0){
      var teamgroup = nowjs.getGroup(userObj.teamID);
      teamgroup.now.c_processUserFileEvent(fname, "joinFile", userObj.clientId, usersInGroup[groupname]);
    }
    //console.log("Added user " + user + " to group: " + group);
  }else{
    console.log("no need to add user " + userObj.clientId + " to group: " + groupname + " ???");
    //console.log(g.users[userObj.clientId]);
  }
}
function removeUserFromFileGroup(userObj, fname){
  var groupname = userObj.teamID + fname;
  var g = nowjs.getGroup(groupname);
  if(g.users[userObj.clientId]){
    // user was in group.
    // remove user from NOW group.
    g.removeUser(userObj.clientId);
    // remove user from local group.
    for(var i=userObj.grouplist.length; i>=0; i--){
      if(userObj.grouplist[i] == groupname){
        userObj.grouplist.splice(i, 1);
      }
    }
    // keep track locally of users in group.
    usersInGroupMinusMinus(groupname);
    if(fname.length > 0){
      var teamgroup = nowjs.getGroup(userObj.teamID);
      teamgroup.now.c_processUserFileEvent(fname, "leaveFile", userObj.clientId, usersInGroup[groupname]);
    }
    //console.log("Removed user " + userObj.clientId + " from: " + groupname);
  }else{
    //console.log(g);
    console.log("no need to remove user " + userObj.clientId + " from group: " + groupname + " ???");
  }
}
function usersInGroupPlusPlus(group){
  if(usersInGroup[group]){
    usersInGroup[group]++;
  }else{
    usersInGroup[group] = 1;
  }
  console.log("UsersInGroup(+): " + group + " >> " + usersInGroup[group]);
}
function usersInGroupMinusMinus(group){
  if(usersInGroup[group]){
    usersInGroup[group]--;
  }else{
    usersInGroup[group] = 0;
  }
  console.log("UsersInGroup(-): " + group + " >> " + usersInGroup[group]);
}
//
// local file stuff
//
var fileSizeCache = [];
function localFileFetch(userObj, fname, fileRequesterCallback){
  var team = userObj.teamID;
  fs.readFile('/NETFS/'+team+"/"+fname, "utf-8", function (err, data) {
    if (err) console.warn(err);
    fileRequesterCallback(fname, data, err, true);
  });
}
function localFileSave(userObj, fname, fcontents, fileSaverCallback){
  var team = userObj.teamID;
  fs.writeFile('/NETFS/'+team+"/"+fname, fcontents, function(err) {
      if(err) {
          console.log(err);
      } else {
      localFileIsMostRecent[team+fname] = true;  // mark file as saved with no pending changes.
          console.log("FILE SAVED: " + fname);
      var filegroup = nowjs.getGroup(team+fname);
      filegroup.now.c_fileStatusChanged(fname, "saved");
      fileSizeCache[team+fname] = fcontents.length;
      }
    fileSaverCallback(err);
  });
}
function localFileCreate(userObj, fname, fileCreatorCallback){
  var team = userObj.teamID;
  if(!fname){
    return;
  }
  var safeFName = fname.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var path = '/NETFS/'+team+"/"+safeFName;
  try{
    fs.realpathSync(path);
    console.log("file already exists.. no need to create it: " + path);
    fileCreatorCallback(safeFName, ["File already exists. No need to create it."]);
  }catch(ex){
    console.log("file doesn't exist yet. creating it: " + path);
    fs.writeFile(path, "", function(err) {
        if(err) {
            console.log(err);
        } else {
        localFileIsMostRecent[teamID+safeFName] = true;  // mark file as saved with no pending changes.
            console.log("FILE SAVED: " + safeFName);
        var filegroup = nowjs.getGroup(teamID+safeFName);
        filegroup.now.c_fileStatusChanged(safeFName, "saved");
        }
      var teamgroup  = nowjs.getGroup(userObj.teamID);
      var fromUserId = userObj.clientId;
      teamgroup.now.c_processUserFileEvent(safeFName, "createFile", fromUserId, 0);
      fileCreatorCallback(safeFName, err);
    });
  }  
}
function localFileDelete(userObj, fname, fileDeleterCallback){
  var team = userObj.teamID;
  if(!fname){
    return;
  }
  var safeFName = fname.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var path = '/NETFS/'+team+"/"+safeFName;
  try{
    fs.realpathSync(path);
    console.log("all set to delete file: " + path);
    fs.unlink(path, function (err) {
        if (err) throw err;
        console.log("successfully deleted: " + path);
      var teamgroup  = nowjs.getGroup(userObj.teamID);
      var fromUserId = userObj.clientId;
      teamgroup.now.c_processUserFileEvent(safeFName, "deleteFile", fromUserId, 0);
      fileDeleterCallback(safeFName, []);
    });
  }catch(ex){
    console.log("trying to delete file, but it doesn't exist: " + path);
    fileDeleterCallback(safeFName, ["File doesn't exist. No need to delete it."]);
  }
}
function localFileRename(userObj, fname, newFName, fileRenamerCallback){
  var team = userObj.teamID;
  if(!fname || !newFName){
    return;
  }
  var safeFName = fname.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var safeNewFName = newFName.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var pathA = '/NETFS/'+team+"/"+safeFName;
  var pathB = '/NETFS/'+team+"/"+safeNewFName;
  try{
    fs.realpathSync(pathA);
    try{
      fs.realpathSync(pathB);
      // if pathB exists, don't do the rename -- it will copy over an existing file!
      console.log("trying to rename file to something that already exists: " + pathA + " >> " + pathB);
      fileRenamerCallback(safeFName, ["Cannot rename a file to something that already exists."]);
    }catch(ex2){
      // ok, all set!
      console.log("all set to rename file: " + pathA + " >> " + pathB);
      fs.rename(pathA, pathB, function (err) {
        if (err) throw err;
          console.log("successfully renamed file: " + pathA + " >> " + pathB);
        var teamgroup  = nowjs.getGroup(userObj.teamID);
        var fromUserId = userObj.clientId;
        teamgroup.now.c_processUserFileEvent(safeFName, "renameFile", fromUserId, 0, safeNewFName);
        fileRenamerCallback(safeFName, []);
      });
    }
  }catch(ex){
    console.log("trying to rename a file that doesn't exist: " + pathA);
    fileRenamerCallback(safeFName, ["File doesn't exist. Cannot rename it."]);
  }
}
function localFileDuplicate(userObj, fname, newFName, fileDuplicatorCallback){
  var team = userObj.teamID;
  if(!fname || !newFName){
    return;
  }
  var safeFName = fname.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var safeNewFName = newFName.split("..").join("").replace(/[^a-zA-Z_\.\-0-9\/\(\)]+/g, '');
  var pathA = '/NETFS/'+team+"/"+safeFName;
  var pathB = '/NETFS/'+team+"/"+safeNewFName;
  try{
    fs.realpathSync(pathA);
    try{
      fs.realpathSync(pathB);
      // if pathB exists, don't do the rename -- it will copy over an existing file!
      console.log("trying to duplicate file but it already exists: " + pathA + " >> " + pathB);
      fileDuplicatorCallback(safeFName, ["Cannot duplicate a file to something that already exists."]);
    }catch(ex2){
      // ok, all set!
      console.log("all set to duplicate file: " + pathA + " >> " + pathB);
      var is = fs.createReadStream(pathA);
      var os = fs.createWriteStream(pathB);
          util.pump(is, os, function(err){
        if (err) throw err;
          console.log("successfully duplicated file: " + pathA + " >> " + pathB);
        var teamgroup  = nowjs.getGroup(userObj.teamID);
        var fromUserId = userObj.clientId;
        teamgroup.now.c_processUserFileEvent(safeFName, "duplicateFile", fromUserId, 0, safeNewFName);
        fileDuplicatorCallback(safeFName, []);
      });
    }
  }catch(ex){
    console.log("trying to dupicate a file that doesn't exist: " + pathA);
    fileDuplicatorCallback(safeFName, ["File doesn't exist. Cannot duplicate it."]);
  }
}
//
// DEPLOY / LAUNCH! :D
//
function localProjectDeploy(userObj, deployerCallback){
  var team       = userObj.teamID;
  var fromUserId = userObj.clientId;
  var projPath = '/NETFS/'+team;
  var projectName = team;
  
  console.log("DEPLOYMENT PLACEHOLDER: " + projectName);

  exec('stop node_'+userObj.teamID, { 
      encoding: 'utf8', 
      timeout: 30000, 
      maxBuffer: 200*1024, 
      killSignal: 'SIGTERM',
      env: null
    }, 
    function (error, stdout, stderr) {
      if (error !== null) {
        console.log('exec error: ' + error);
      }
      console.log("STOP: " + stdout);
      exec('start node_'+userObj.teamID, { 
          encoding: 'utf8', 
          timeout: 30000, 
          maxBuffer: 200*1024, 
          killSignal: 'SIGTERM',
          env: null
        }, 
        function (error, stdout, stderr) {
          if (error !== null) {
            console.log('exec error: ' + error);
          }
          var launchURL = "http://"+userObj.teamID+".chaoscollective.org/";
          console.log("START: " + stdout);
          console.log("DEPLOY SUCCESSFUL: " + launchURL);
          setTimeout(function(){
            var teamgroup  = nowjs.getGroup(team);
            teamgroup.now.c_processUserFileEvent("", "launchProject", fromUserId, 0);
          }, 50);
          setTimeout(function(){
            deployerCallback(null, launchURL);  
          }, 1500);    
        }
      ); // exec 2
    }
  ); // exec 1

  
  /*
  var haibuApp = {
    "user": team,
    "name": projectName,
    "domain": projectName+".chaoscollective.org",
    "repository": {
      "type": "local",
      "directory": projPath,
    },
    "scripts": {
      "start": "server.js"
    }
  };
  
  // Attempt to clean up an existing application
  haibuClient.clean(haibuApp, function (err, result) {
    if (err) {
      console.log('Error cleaning app during deployment of: ' + haibuApp.name);
      deployerCallback([err]);
      //return eyes.inspect(err);
    }else{
      console.log('Successfully cleaned app: ' + haibuApp.name);
      haibuClient.start(haibuApp, function (err, result) {
        if (err) {
          console.log('Error starting app during deployment of: ' + haibuApp.name);
          deployerCallback([err]);
          //return eyes.inspect(err);
        }else{
          console.log("DEPLOYMENT SUCCESSFUL: " + haibuApp.name);
          console.log(result);
          var launchURL = "http://"+result.drone.host+":"+result.drone.port+"/";
          deployerCallback(null, launchURL);
        }
      });
    }
  });
  */
}
//
// UTF-8 data encode/decode: http://www.webtoolkit.info/
var Utf8 = {
  encode : function (string) { // public method for url encoding
    string = string.replace(/\r\n/g,"\n");
    var utftext = "";
    for (var n = 0; n < string.length; n++) {
      var c = string.charCodeAt(n);
      if (c < 128) {
        utftext += String.fromCharCode(c);
      }
      else if((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192);
        utftext += String.fromCharCode((c & 63) | 128);
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224);
        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
        utftext += String.fromCharCode((c & 63) | 128);
      }
    }
    return utftext;
  },
  decode : function (utftext) { // public method for url decoding
    var string = "";
    var i = 0;
    var c = c1 = c2 = 0;
    while ( i < utftext.length ) {
      c = utftext.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      }
      else if((c > 191) && (c < 224)) {
        c2 = utftext.charCodeAt(i+1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      }
      else {
        c2 = utftext.charCodeAt(i+1);
        c3 = utftext.charCodeAt(i+2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
}


//
//
//
console.log("** Node service up and running **\n");


