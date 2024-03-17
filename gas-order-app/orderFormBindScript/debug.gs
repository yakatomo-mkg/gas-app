/** デバッグ関数 */
function debug(value="デバッグテスト") {
  const date = new Date();
  const targetRow = log_sheet.getLastRow() + 1;

  let outPutValue = value;
  if (typeof value === "object") {
    outPutValue = JSON.stringify(value);
  }
  log_sheet.getRange("A" + targetRow).setValue(date);
  log_sheet.getRange("B" + targetRow).setValue(outPutValue);
}



// 関数の実行にかかる計測時間をコンソールログに出力する
function timeOutputLog(label, func, ...args) {
  console.time(label);  // 計測を開始
  func(...args)  // 渡された関数を実行
  // func();  // 渡された関数を実行
  console.timeEnd(label);  // 計測を終了してログに出力
}