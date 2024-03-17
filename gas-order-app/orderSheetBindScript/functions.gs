/** ==========================
 * 関数配置のルール: 
 *    関数Aの中で、関数Bを使うとき
 *    (前) 関数A
 *    (後) 関数B 
 * =========================== */


/** 
 * LINEユーザーに応答メッセージを送信する関数 
 */
function sendReplyMessage(reply_token, messages) {
  const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply"; 
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
    },
    payload: JSON.stringify({
      replyToken: reply_token,
      messages: messages,
    }),
  };
  // 応答を送信
  const res = UrlFetchApp.fetch(LINE_REPLY_URL, options);
  return res;
}


/** 
 * 引数で指定したLINEユーザーに、pushメッセージを送信する関数
 * (任意のタイミングでメッセージを送信できる)
 */
function sendPushMessage(line_user_id, message) {
  const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";
  const post_data = {
    to: line_user_id,
    messages: [
      {
        type: "text",
        text: message,
      },
    ],
  };
  const headers = {
    "Content-Type": "application/json; charset=UTF-8",
    Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
  };
  const options = {
    method: "post",
    headers: headers,
    payload: JSON.stringify(post_data),
  };
  const res = UrlFetchApp.fetch(LINE_PUSH_URL, options);
  return res;
}


/** 
 * LINE Notify API で adminグループLINE　にメッセージを送信する関数
 */
function notifyToAdmin(message) {
  const LINE_NOTIFY_URL = "https://notify-api.line.me/api/notify";
  const options = {
    method: "post",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${LINE_NOTIFY_TOKEN}`,
    },
    payload: {
      message: message,
    },
  };
  const res = UrlFetchApp.fetch(LINE_NOTIFY_URL, options);
  return res;
}

/** 
 * スクリプトキャッシュ(データの一時的な保存サービス)を操作するためのヘルパー関数
 */
function makeCache() {
  const cache = CacheService.getScriptCache();  // スクリプトキャッシュのインスタンスを作成
  return {
    /**
     * getプロパティ : 指定されたキーに対応する値を取得する
     * @param {string} key - キャッシュされたデータのキー
     * @returns {any} キーに対応するvalue
     */
    get: function(key) {
      return JSON.parse(cache.get(key));  // JSオブジェクトにパースして返す
    },

    /**
     * putプロパティ : 指定されたキーとvalueをキャッシュに保存する
     * @param {string} key - キャッシュするデータのキー
     * @param {any} value - キャッシュする値
     * @param {number} [sec] - 有効期間（秒）。デフォルトは10分(600秒)
     * @returns {any} キャッシュされた値
     */
    put: function(key, value, sec) {
      cache.put(key, JSON.stringify(value), (sec === undefined) ? 600 : sec);  // JSON文字列に変換して保存
      return value;
    },

    /**
     * removeプロパティ : 指定されたキーに対応するvalueをキャッシュから削除する
     * @param {string} key - 削除するデータのキー
     * @returns {boolean} 削除が成功したかどうかを示す真偽値
     */    
    remove: function(key) {
      cache.remove(key);
      return true;  // キャッシュデータ削除成功時のの確認用返り値
    }
  };
}


/** 
 * LINEユーザーIDをもとに、プロフィール情報を取得してくる関数
 */
function getUserProfile(user_id) {
  // ユーザ情報を取得するための、Messaging APIエンドポイント
  const LINE_GET_PROFILE_URL = `https://api.line.me/v2/bot/profile/${user_id}`;
  const user_profile = UrlFetchApp.fetch(LINE_GET_PROFILE_URL, {
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_TOKEN}`,
      },
    })
    return JSON.parse(user_profile).displayName;  // アカウント名を返す
}


/** 
 * 引数で指定した注文IDがセットされた、(回答用)事前入力フォームURLを生成する関数
 */ 
// 【参考】　事前入力URLの形式： 
// https://docs.google.com/forms/d/e/${PUBLISHED_URLのID}/viewform?usp=pp_url&entry.2020293863=ID&entry.1816552923=2024-02-25 */ 
const generatePrefilledFormUrl = (order_id) => {
  // ピュアな公開用URLから、不要なクエリパラメータ 「?usp=sf_link」 を取り除く
  const base_url = PUBLISHED_FORM_URL.replace(/\?usp=sf_link$/, "");
  // 事前入力URLの形式に整形
  const prefilled_url = `${base_url}?usp=pp_url&entry.${form_sheet_config.ENTORY_OF_ORDER_ID}=${order_id}`;
  return prefilled_url;
}


/** 
 * フォームの回答データから必要情報を取得する関数
 * @param : {object} e = イベントオブジェクト 
 * @return: {Array} = 注文データ群(質問のタイトル、回答)
 * */
function getOrders(e) {
  console.log(`フォーム名: ${e.source.getTitle()}`);
  console.log(`フォームID: ${e.source.getId()}`);

  const form_responses = e.response.getItemResponses();  // フォームの回答を取得
  const order_data = [];  // 注文データを格納する配列

  for (const res of form_responses) {
    const item = res.getItem();
    const item_idx = item.getIndex();   // 設問番号
    const item_title = item.getTitle();  // 質問のタイトル
    let item_answer = res.getResponse();   // 回答

    // メニュー項目の回答は数値（注文数）であるため、フォーマットを整形しておく
    const MENU_START_ID = 7;  // メニュー項目がスタートするID
    if (item_idx >= MENU_START_ID && item_idx < form_responses.length - 1) {  // 最後の質問項目(「コメント」)をループ対象から除くため "-1"
      // 前後の空白文字を除去
      item_answer = item_answer.trim();
      // 先頭が0から始まる場合は、0を除去した数値に変換
      if (/^0+/.test(item_answer) && item_answer.length > 1) {
        item_answer = parseInt(item_answer, 10);
      }
    }
   
    // 上記で取得した項目を1セットにして配列に格納
    order_data.push({
      id: item_idx,
      question: item_title,
      answer: item_answer.toString()  // 数値文字列に変換(ex. 「9」 -> 「'9'」)
    });
  }
  console.log(order_data);
  /**
   * console.log(order_data)の出力結果:
    [ { id: 0, question: '注文ID', answer: '18e3b197f04' },
      { id: 1, question: 'お届け日', answer: '2024-03-19' },
      { id: 2, question: '飲食店名', answer: 'デンマーと' },
      { id: 3, question: 'お届け先住所', answer: '新安城' },
      { id: 4, question: 'メールアドレス', answer: 'denmart@gmail.com' },
      { id: 5, question: '電話番号', answer: '09022223333' },
      { id: 7, question: 'だいこん', answer: '' },
      { id: 8, question: 'ブロッコリー', answer: '      0' },
      { id: 9, question: 'ほうれん草', answer: '       09' },
      { id: 10, question: 'にんじん', answer: '4' },
      { id: 11, question: 'かぶ（あやめ）', answer: '5' },
      { id: 12, question: 'コメント欄', answer: '大根は無し、ブロッコリーは空白ありの0、ほうれん草は空白入り数字' } 
    ]
   */

  debug(order_data);
  return order_data;
}


/** 
 * フォームの質問項目を取得する関数
 * @param :  - 
 * @return: {Array} = メニュー項目群(=質問のタイトル)
 * */
const getFormItems = () => {
  const items = form.getItems();
  const titles = items.map(item => item.getTitle());
  return titles;
}

/** 
 * orderシートのヘッダー項目を取得する関数
 * @param : - 
 * @return: {Array} = orderシートのヘッダー項目群
 * */
const getOrderSheetHeaders = () => {
  const headers = order_sheet.getRange(1, 1, 1, order_sheet.getLastColumn()).getValues()[0];
  console.log(headers);
  return headers;
}


/** 
 * フォームtitleに対応するシート列の列番号を取得する関数
 * @param1 : String  = フォームの質問タイトル
 * @param2 : {array}  = ヘッダーの値が格納された配列
 * @return : number  = シート列のインデックス
 * */
const getColumnNumberByTitle = (title, headers) => {
  return headers.indexOf(title) + 1;  // 「+1」で、indexを列番号に変換
}

/**
 * LINEで通知する注文内容メッセージを作成
 * @param : {order_data} = getOrders()で取得したorder_data
 * @return: {message} = メッセージ本文
 */
const createOrderMessage = (order_data) => {
  let message = "";

  // 基本情報
  message += `\n\n注文ID：${order_data[0].answer}`;
  message += `\nお届け日：${order_data[1].answer}`;
  message += `\nお名前：${order_data[2].answer}`;

  // メニュー情報 （start_index 〜　最後の要素の１つ手前まで）
  message += `\n\n【 注文内容 】`;
  const start_index = 6;  // メニュー項目の開始インデックス
  for (let i = start_index; i < order_data.length - 1; i++) {
    const order = order_data[i];
    // 回答があるメニュー項目のみメッセージに含める
    if (order && order.answer !== "" && order.answer !== "0") {
      message += `\n${order.question} ： ${order.answer}`;
    }
  }
  const comment = order_data[order_data.length - 1];
  if (comment && comment.answer && comment.answer.trim() !== "") {
    message += `\n\nコメント：\n${comment.answer}`;
  }
  return message;
}


