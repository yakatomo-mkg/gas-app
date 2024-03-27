/** ---------------------------
 * SpreadSheetの設定
 * ---------------------------- */

/* コンテナバインドスクリプトにおいては、getActiveSpreadsheet()を使用する方が、共同編集時などに競合が発生しにくい!! */
const ss = SpreadsheetApp.getActiveSpreadsheet();  // バインドしているスプレッドシート

// 各シートをグローバル変数としてキャッシュするオブジェクト(sheets)を定義
const sheets = {
  config: ss.getSheetByName("config"),  // 各種設定シート
  order: ss.getSheetByName("order"),   // フォーム回答を取得するシート
  menu: ss.getSheetByName("menu"),  // メニュー項目を管理するシート
  // freee: ss.getSheetByName("freee"),
  // partners: ss.getSheetByName("partners"),
  // admin: ss.getSheetByName("admin"),
  // form: ss.getSheetByName("form"),
  log: ss.getSheetByName("logs")
}

// シートを取得するときはこの関数を呼び出す
function getSheet(sheetName) {
  return sheets[sheetName];
}

// 各シートをグローバル変数として取得 (これにより、シート名を呼び出すだけでどこからでもアクセスできる)
const configSheet = getSheet("config");
const orderSheet = getSheet("order");
const menuSheet = getSheet("menu");
// const freeeSheet = getSheet("freee");
// const partnersSheet = getSheet("partners");
// const adminSheet = getSheet("admin");
// const formSheet = getSheet("form");
const logSheet = getSheet("log");


/** 各シートのセルの位置や列番号をオブジェクトとして管理 */
// menuシートの列番号を定義
const MENU_SHEET_SETTINGS = {
  contStartRow: 3,  // 操作対象のコンテンツが開始する行(1,2行目はヘッダー)
  ckBoxCol: 1,  // チェックボックス設定列
  itemIdCol: 2,
  itemNameCol: 3,
  itemUnitCol: 4,
  itemAmtCol: 5,
  itemPriceCol: 6,
  upperLimitCol: 7,
  formTypeCol: 8,
  orderCol: 9,    // orderシートの列番号
  comment: 10,
  fmStartCol: 12,  // フォームメニュー管理エリアの起点列
  questionIdCell: "S3",  // 「注文ID」の質問IDをセットするセル位置
  formPublishedUrlCell: "S4",  // 更新後の公開用フォームURLをセットするセル位置
};

const ORDER_SHEET_SETTINGS = {
  ckBoxCol: 1,
  acptDateCol: 2,
  orderIdCol: 3,
  shopNameCol: 4,
  emailCol: 5,
  deliDateCol: 6,
  commentCol: 7,
  menuStartCol: 8,
}

// /** 指定したシートにおいて、start列およびend列の範囲における最終行を取得する関数 */ 
// function getLastRowInRange(sheet, startCol, endCol, rows = sheet.getLastRow()) {  // 第3引数の「行数」は、デフォルト値を設定
//   const rangeVals = sheet.getRange(1, startCol, rows, endCol - startCol + 1).getValues();
//   for (let i = rangeVals.length - 1; i >= 0; i--) {
//     if (rangeVals[i].some(cell => cell.toString().trim() !== "")) {
//       return i + 1;  // 最終行の行数を返す
//     }
//   }
//   return 0;  // データが存在しない場合は「0」を返す
// }



/** -------------------------
 * 注文フォームの設定
 * -------------------------*/
const FORM_ID = "1o6VEexBIj7W3CLsws4WAo-HdQvf77uEIrDSEIUeeGbU"
const form = FormApp.openById(FORM_ID);


