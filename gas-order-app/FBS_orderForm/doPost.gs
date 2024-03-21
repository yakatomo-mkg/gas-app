/**
 * LINEからのリクエスト処理(LINEの各Webhookイベントに対する処理)
 */

function doPost(e) {
  const event = JSON.parse(e.postData.contents).events[0];
  const event_type = event.type;
  const line_user_id = event.source.userId;  // LINEユーザーID  
  const reply_token = event.replyToken;  // LINE返信用トークン (応答時に必要)


  // 友だち追加イベントを受信した場合
  switch (event_type) {
    case "message":
      handleMessageEvent(event, line_user_id, reply_token);
      break;
    case "follow":
      handleFollowEvent(line_user_id);
      break;
    default:
      // 上記のイベント以外のときは何もしない
      break;
  }

  // レスポンスを返して、タイムアウトエラーを回避する
  return ContentService.createTextOutput().setMimeType(ContentService.MimeType.TEXT);
}


const handleMessageEvent = (event, line_user_id, reply_token) => {
  const user_message = event.message.text;

  if (user_message !== "注文" && user_message !== "いいえ") {
    return;
  }
    
  let reply_message = [];  // 応答メッセージを格納する変数
  if (user_message === "注文") {
    // 現在時刻から、「注文ID」を生成する
    const now = new Date();
    const order_id = now.getTime().toString(16);  // UNIXタイムスタンプを16進数表記に変換
    debug(`1. 注文IDを生成: ${order_id}`);

    // // フォームのタイトル説明欄に注文IDをセット
    // form.setDescription(`注文ID：${order_id}`);
    // debug(`formにセット： 「${form.getDescription()}」`);
    // // 更新（注文IDがセット）されたフォームの公開用URLを取得
    // const formPublishedUrl = form.getPublishedUrl();
    // debug(`フォームURLを発行：${formPublishedUrl}`);

    // 注文IDをフォームの初期値にセットして、事前入力された公開用URLを作成する
    const prefilled_url = generatePrefilledFormUrl(order_id);
    debug("2. 注文IDをセットしてフォーム作成");
    debug(prefilled_url);

    // キャッシュに注文IDをキーにして、LINEユーザーIDを保存
    cache = makeCache();  // キャッシュを初期化
    cache.put(order_id, line_user_id, 3600); // キャッシュに設定 （有効期間は１時間）
    debug(`3. キャッシュPUT完了: ${cache.get(order_id)}`);

    reply_message =  [
      {
        type: "template",
        altText: "注文受付",
        template: {
          type: "confirm",
          text: "注文を開始してよろしいですか？",
          actions: [
            {
              type: "uri",   
              label: "はい",
              uri: prefilled_url
            },
            {
              type: "message",
              label: "いいえ",
              text: "いいえ"
            }
          ]
        }
      }
    ];
    sendReplyMessage(reply_token, reply_message);
    debug(`4. 注文リプライ完了: ${line_user_id}`);
    return;
  }
  else if (user_message === "いいえ") {
    reply_message = [
      {
        type: "text",
        text: "承知しました。\n何かございましたら、お気軽にお問い合わせください。",
      }
    ];
    sendReplyMessage(reply_token, reply_message);
    return;
  } 
  else {
    return;
  }
}   

  
const handleFollowEvent = (line_user_id) => {
  const display_name = getUserProfile(line_user_id);
  customer_sheet.appendRow([line_user_id, display_name]);
  customer_sheet.getDataRange().removeDuplicates([1]);  // 列（1列目:ID)を指定して重複判定

  debug(`友だち追加イベント処理完了 : ${display_name}`);
}