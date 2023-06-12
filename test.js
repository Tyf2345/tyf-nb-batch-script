const ora = require("ora");
const spinner = ora({
//   text: "loading...",
  prefixText: "模块下载中",
  
  color: "yellow",
  spinner: {
    interval: 80,
    frames: ["-", "+", "-"],
  },
  hideCursor: true
});
spinner.start();
setTimeout(() => {
    spinner.prefixText = '模块下载中1'
}, 500);
setTimeout(() => spinner.stop(), 2000);
