/** -------------------------------------
 * スクリプトプロパティから環境変数を取得
 * ------------------------------------- */
const OM_SHEET_ID = PropertiesService.getScriptProperties().getProperty("OM_SHEET_ID");

// フォーム編集用（管理者用）
const FORM_ID = PropertiesService.getScriptProperties().getProperty("FORM_ID");
// フォーム回答用 （公開URL）
const PUBLISHED_FORM_URL = PropertiesService.getScriptProperties().getProperty("PUBLISHED_FORM_URL");

// LINEチャネル（Messaging API）のアクセストークン
const LINE_CHANNEL_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_TOKEN");
// LINE Notifyのアクセストークン
const LINE_NOTIFY_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TOKEN");


/** ---------------------------
 * 注文管理用SpreadSheetの設定
 * ---------------------------- */
const ss = SpreadsheetApp.openById(OM_SHEET_ID);

// 各シートをグローバル変数としてキャッシュするオブジェクト(sheets)を定義
const sheets = {
  config: ss.getSheetByName("config"),
  order: ss.getSheetByName("order"),
  menu: ss.getSheetByName("menu_db"),
  customer: ss.getSheetByName("customer_db"),
  freee: ss.getSheetByName("freee"),
  partners: ss.getSheetByName("partners"),
  admin: ss.getSheetByName("admin"),
  form: ss.getSheetByName("form"),
  log: ss.getSheetByName("logs")
}

// シートを取得するときはこの関数を呼び出す
function getSheet(sheet_name) {
  return sheets[sheet_name];
}

// 各シートをグローバル変数として取得 (これにより、シート名を呼び出すだけでどこからでもアクセスできる)
const config_sheet = getSheet("config");
const order_sheet = getSheet("order");
const menu_sheet = getSheet("menu");
const customer_sheet = getSheet("customer");  /** partnersシートと一元化したい */
const freee_sheet = getSheet("freee");      // 注文データ転記先 & 納品書作成シート
const partners_sheet = getSheet("partners");   // 取引先管理シート(freeeシートにおけるプルダウンの参照先)
const admin_sheet = getSheet("admin");
const form_sheet = getSheet("form");
const log_sheet = getSheet("log");


/** ----------------------------------
 * その他のグローバル変数
 * ----------------------------------- */

// orderシートのヘッダー項目の　「列番号」　 (注意: index番号ではない!! )
const order_sheet_config = {
  ACCEPTED_DATE_COLUMN: 2,  // 注文受付日
  ORDER_ID_COLUMN: 3,       // 注文ID
  DELIVERY_DATE_COLUMN: 4,  // お届け日
  NAME_COLUMN: 5,           // 名前
  ADDRESS_COLUMN: 6,        // 住所
  MAIL_COLUMN: 7,           // メール
  PHONE_COLUMN: 8,          // 電話番号
  COMMENT_COLUMN: 9,        // コメント
  START_MENU_COLUMN: 10,     // メニュー開始列
}

// formシートの設定を定義
const form_sheet_config = {
  START_MENU_ROW: 16,  // メニュー項目の開始行
  ENTORY_OF_ORDER_ID: form_sheet.getRange("E9").getValue(),
}



/**
 * 指定したセル(ex.'B5')の行番号と列番号を取得する関数
 */
function getRowAndColumn(sheet, cell_address) {
  const range = sheet.getRagne(cell_address);
  const row = range.getRow();
  const col = range.getColumn();

  return { row: row, column: col};
}

// 上記関数の使い方：
// const { row: target_row, column: target_col } = getRowAndColumn(target_sheet, "B5");



/** -------------------------
 * Googleフォームの設定 
 * -------------------------*/

// グローバル変数としてのフォームオブジェクトを作成
function getOrderForm() { 
  return FormApp.openById(FORM_ID);
}

// フォーム送信時のトリガーを設定
function createFormSubmitTrigger() {
  const form = getOrderForm();

  // フォーム送信時のトリガーを作成
  ScriptApp.newTrigger('onFormSubmit')
    .forForm(form)
    .onFormSubmit()
    .create();
}

// フォームオブジェクトをグローバル変数として取得
const form = getOrderForm();


/** -------------------------------
 * freee設定
 * -------------------------------　*/

// freee API エンドポイントのベース部分
const BASE_URL = 'https://api.freee.co.jp';

// 事業所(自社)名とIDの取得
const own_company_name = partners_sheet.getRange('E4').getValue();
const own_company_id = partners_sheet.getRange('F4').getValue();
