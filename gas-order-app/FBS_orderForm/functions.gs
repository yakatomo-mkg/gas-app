/** 関数配置のルール: 関数Aの中で、関数Bを使うとき
 *  (前) 関数B
 *  (後) 関数A 
 * */

// 応答メッセージを送信する関数
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


// ユーザーを指定して、pushメッセージを送信する関数
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



// LINE Notify API で adminグループLINEにメッセージを送信
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



// cacheに保存するデータをJSON形式で扱うため & 適切な返り値を返すため の関数
function makeCache() {
  const cache = CacheService.getScriptCache();  // スクリプトキャッシュのインスタンスを作成
  return {
    // 指定されたキーに対応する値を取得し、JavaScriptオブジェクトに変換してreturnする関数
    get: function(key) {
      return JSON.parse(cache.get(key));
    },
    // 指定されたキーと値を、JSON形式に変換してキャッシュに保存する関数
    put: function(key, value, sec) {
      // secは有効期間（未指定の場合はデフォルトの10分(600秒)を使用
      cache.put(key, JSON.stringify(value), (sec === undefined) ? 600 : sec);
      return value;
    },
    remove: function(key) {
      cache.remove(key);
      return true;  // remove成功時の確認用返り値
    }
  };
}


// LINEユーザーIDをもとに、プロフィール情報を取得してくる関数
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

// order_idを引数で受け取り、事前入力された回答用フォームURLを生成する関数
/** 事前入力URLの形式： 
 *  https://docs.google.com/forms/d/e/${PUBLISHED_URLのID}/viewform?usp=pp_url&entry.2020293863=ID&entry.1816552923=2024-02-25 */ 
const generatePrefilledFormUrl = (order_id) => {
  // ピュアな公開用URL（PUBLISHED_FORM_URL）から不要なクエリパラメータ 「?usp=sf_link」 を取り除く
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
  const responses = e.response.getItemResponses();  // フォームの回答を取得
  const order_data = [];  // 注文データを格納する配列

  responses.forEach(function(res) {
    const item_title = res.getItem().getTitle();  // 質問のタイトル
    const item_answer = res.getResponse();   // 回答
    // 上記で取得した項目を1セットにして配列に格納
    order_data.push({
      question: item_title,
      answer: item_answer
    });
  });
  debug(order_data)
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
    // 回答がある場合のみメッセージに含める
    if (order && order.answer && order.answer.trim() !== "") {
      message += `\n${order.question} ： ${order.answer}`;
    }
  }
  const comment = order_data[order_data.length - 1];
  if (comment && comment.answer && comment.answer.trim() !== "") {
    message += `\n\nコメント：\n${comment.answer}`;
  }
  return message;
}

// // adminシートから管理者全員のLINE_IDを取得する関数
// function getAllAdminId() {
//   const all_admin_id = admin_sheet.getRange(2, 1, admin_sheet.getLastRow() - 1, 1).getValues().flat();
//   return all_admin_id;
// }

