#!/usr/bin/env node
//@ts-check
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

if(!process.argv[2]) {
  console.error("Please provide a folder name.");
  console.error("Usage: npm init @tiddlywiki/mws[@latest] <folder-name>");
  process.exit(1);
}
const folder = path.resolve(process.cwd(), process.argv[2]);
console.log(`${folder}`);

const filesFolder = path.resolve(__dirname, "files");
if(!fs.existsSync(filesFolder)) {
  console.error(`Files folder ${filesFolder} does not exist. This is a bug in the script.`);
  process.exit(1);
}

if(fs.existsSync(folder)) {
  console.error(`Folder ${folder} already exists. Please choose a different name.`);
  process.exit(1);
}

// create the folder
fs.mkdirSync(folder, { recursive: true });

// copy files into the folder
fs.readdirSync(filesFolder).forEach(file => {
  const filePath = path.join(filesFolder, file);
  if(!fs.statSync(filePath).isFile()) return;
  const abspath = path.resolve(folder, file);
  if(fs.existsSync(abspath)) {
    console.log(`File ${file} already exists. Skipping...`);
    return;
  }
  console.log(`├─ ${file}`);
  fs.writeFileSync(abspath, fs.readFileSync(filePath));
});

// run npm install 
console.log("└─ Running npm install...");
start("npm", ["install", "--save-exact", "tiddlywiki@latest", "@tiddlywiki/mws@latest"], {
  ...process.platform === "android" ? {
    GYP_DEFINES: "android_ndk_path=''",
  } : {}
}, { cwd: folder }).catch(console.log)

// ========================================================================================

/**
 * @param {string} cmd
 * @param {readonly string[]} args
 * @param {Record<string, string>} [env2]
 * @param {{ cwd?: string, pipeOut?: boolean }} [opts]
 */
function start(cmd, args, env2 = {}, { cwd = process.cwd(), pipeOut = false } = {}) {
  const cp = spawn(cmd, args, {
    cwd,
    env: { ...process.env, ...env2, },
    shell: true,
    stdio: ["pipe", pipeOut ? "pipe" : "inherit", "inherit"],
  });
  if(cp.stdin) cp.stdin.end();
  if(pipeOut) {
    return new Promise((r, c) => {
      const chunks = [];
      if(cp.stdout) cp.stdout.on("data", (data) => {
        chunks.push(data);
      });
      if(cp.stdout) cp.stdout.on("end", () => {
        r(chunks.map(e => e.toString()).join(""));
      });
      cp.on("exit", (code) => {
        if(code) c(code);
      });
    });
  } else {
    return /** @type {Promise<void>} */(new Promise((r, c) => {
      cp.on("exit", (code) => { if(code) c(code); else r(); });
    }));
  }


}