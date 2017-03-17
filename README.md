This repository is built with a sandbox testing idea in mind. It's assumed to be running on an Ubuntu 14.04 LTS operating system with NodeJs 6.x runtime. Please install the mentioned components by [the script(s) here](https://github.com/genxium/Ubuntu14InitScripts/tree/master/backend/node).   

To test in a sandbox, please start an [WeChat sandbox/fserver](https://github.com/genxium/fserver) daemon beforehand. 

```
shell@proj-root> npm install
shell@proj-root> ./examples/overwrite_configs 
shell@proj-root> node ./examples/singleton.js
```
