//
// SERVER-SIDE
//
// things to do before launch.. like compiling things!
//

console.log("PreLaunch..........");
var util    = require("util");
var fs      = require('fs');

/*
var stylus  = require('stylus');
function renderStylusToCSSFile(fnameRoot){
  var fileBase = __dirname+"/public/"+fnameRoot;
  stylus(fs.readFileSync(fileBase+".styl", "utf8")).set('filename', fileBase+'.css').render(function(err, css){
    if (err) {
      console.log("ERR: Stylus parse error >> " + fileBase+ " >> " + err);
    }else{ 
      fs.writeFileSync(fileBase+".css", "/*\n// NOTE: Do not edit this CSS file directly. It is generated automatically on LAUNCH.\n// Edit the Stylus file ("+fnameRoot+".styl) instead... :) \n*\/\n\n"+css, "utf8");
      console.log("Stylus Rendered >> " + fileBase+".styl to .css");
    }
  });
}
// call out each stylus file to render pre-launch here...
renderStylusToCSSFile("index");
*/
console.log("PreLaunch complete.");