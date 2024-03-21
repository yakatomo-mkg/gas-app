/**
 * orderシートをfreee用スプレッドシートにコピーする
 * （トリガーのタイミングは要相談）
 */

const copyToFreeSheet = () => {

  // コピー先のシートを取得
  const FREEE_SHEET_ID = config_sheet.getRange("C12");
  const TARGET_SHEET = config_sheet.getRange("C13");
  console.log(FREEE_SHEET_ID, TARGET_SHEET);
  const freee_sheet = SpreadsheetApp.openById(FREEE_SHEET_ID).getSheetByName(TARGET_SHEET);

  // // コピーしたい範囲名を取得
  // const values = order_sheet.getRange("コピーしたい範囲").getValues();

  // // コピー先にペースト
  // freee_sheet.getRange("ペーストしたい範囲").setValues(values);
}
