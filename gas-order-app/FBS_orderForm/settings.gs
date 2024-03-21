/** -----------------------------
 * スクリプトプロパティから環境変数を取得
 * ------------------------------*/
const SHEET_ID = PropertiesService.getScriptProperties().getProperty("SHEET_ID");

// フォーム編集用（管理者用）
const FORM_ID = PropertiesService.getScriptProperties().getProperty("FORM_ID");
// フォーム回答用 （公開URL）
const PUBLISHED_FORM_URL = PropertiesService.getScriptProperties().getProperty("PUBLISHED_FORM_URL");

// LINEチャネル（Messaging API）のアクセストークン
const LINE_CHANNEL_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_CHANNEL_TOKEN");
// LINE Notifyのアクセストークン
const LINE_NOTIFY_TOKEN = PropertiesService.getScriptProperties().getProperty("LINE_NOTIFY_TOKEN");


/** -------------------------
 * SpreadSheetの設定 
 * --------------------------*/
const ss = SpreadsheetApp.openById(SHEET_ID);

// 各シートオブジェクトを一度だけ取得し、グローバル変数としてキャッシュしておく
const sheets = {
  order: ss.getSheetByName("order"),
  config: ss.getSheetByName("config"),
  customer: ss.getSheetByName("customer_db"),
  admin: ss.getSheetByName("admin"),
  form: ss.getSheetByName("form"),
  log: ss.getSheetByName("logs"),
}

// シートを取得するときはこの関数を呼び出す
function getSheet(sheet_name) {
  return sheets[sheet_name];
}

// 各シートオブジェクトを先に用意しておき、いつでも使えるようにする
const order_sheet = getSheet("order");
const config_sheet = getSheet("config");
const customer_sheet = getSheet("customer");
const admin_sheet = getSheet("admin");
const form_sheet = getSheet("form");
const log_sheet = getSheet("log");


// adminシートから管理者全員のLINE_IDを取得する関数
function getAdminsId() {
  // Range()で返される値は二次元配列のため、flat()で一元化
  const admins_id = admin_sheet.getRange(2, 1, admin_sheet.getLastRow() - 1, 1).getValues().flat();
  return admins_id;
}

// // adminシートに登録された管理者メンバー全員にメッセージを送信する関数  <= LINE Notifyで代替
// function sendToAdmin(message) {
//   const admins_id = getAdmin();
//   admins_id.forEach(admin_id => {
//     sendPushMessage(admin_id, message);
//   })
// }


// orderシートのヘッダー項目の列番号を定義 (注意: index番号ではない!! )
const order_sheet_config = {
  ACCEPTED_DATE_COLUMN: 1,  // 注文受付日
  ORDER_ID_COLUMN: 2,       // 注文ID
  DELIVERY_DATE_COLUMN: 3,  // お届け日
  NAME_COLUMN: 4,           // 名前
  ADDRESS_COLUMN: 5,        // 住所
  MAIL_COLUMN: 6,           // メール
  PHONE_COLUMN: 7,          // 電話番号
  COMMENT_COLUMN: 8,        // コメント
  START_MENU_COLUMN: 9,     // メニュー開始列
}

// formシートの設定を定義
const form_sheet_config = {
  START_MENU_ROW: 16,  // メニュー項目の開始行
  ENTORY_OF_ORDER_ID: form_sheet.getRange("E9").getValue(),
}


/** -------------------------
 * Googleフォームの設定 
 * -------------------------*/

// 管理者権限として、フォームアプリを操作(フォームの編集時などに使用)するためのインスタンスを取得する関数
function getOrderForm() { 
  return FormApp.openById(FORM_ID);
}

// Formオブジェクト(プログラムでの操作用)
const form = getOrderForm();


/** -------------------------------
 * LINE設定 
 * -------------------------------　*/

// LINE Messaging API のエンドポイント
// const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";  // LINEからのイベントに対して応答メッセージを送信するAPI
// const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";    // 任意のタイミングでメッセージを送信するAPI
// // const GET_USER_PROFILE_URL = `https://api.line.me/v2/bot/profile/${line_user_id}`;  // ユーザー情報を取得するAPI
