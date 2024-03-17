/**
 * フォームが送信時に発火する関数
 */
function onFormSubmit(e) {
  // イベントオブジェクトから、フォームの回答結果を取得
  const received_order = getOrders(e);

  const order_id = received_order[0].answer;  // 最初の要素から注文IDを取得しておく
  debug(`1. Form 注文ID: ${order_id}`);

  const timestamp = e.response.getTimestamp();  // タイムスタンプ（submitした時刻）を取得
  
  // フォームのメニュー項目だけを抽出する
  debug(`2-2. FormItem: ${getFormItems()}`);
  // getFormItems()の出力例 : [注文ID, お届け日, 飲食店名, お届け先住所, メールアドレス, 電話番号, メニュー, 大根, ブロッコリー, ほうれん草, にんじん, コメント欄]
  const menu_of_form = getFormItems().slice(7, -1);  // メニュー項目は8番目要素〜最後の１つ前まで

  // orderシートのヘッダー項目を取得
  const all_headers = getOrderSheetHeaders();  // 全てのヘッダー項目
  const menu_headers = all_headers.slice(order_sheet_config.START_MENU_COLUMN - 1);  // メニュー項目のみ (slice関数は引数にindex番号をとる)

  // フォームにあってシートに無い 「メニュー項目」　を配列で取得 (２つの配列の差分を取得)
  const diff = menu_of_form.filter(menu => !menu_headers.includes(menu));
  debug(`3. diff要素: ${diff}`);
  debug(`3-2. header(menu): ${menu_headers}`);
  debug(`3-3. form(menu): ${menu_of_form}`);

  // 上記のdiff配列を、既存の全ヘッダー項目の配列と結合して、orderシートに転記 
  const new_all_headers = all_headers.concat(diff);
  const new_menu_headers = new_all_headers.slice(order_sheet_config.START_MENU_COLUMN - 1);
  debug(`3-4. New header(menu): ${new_menu_headers}`);
  order_sheet.getRange(1, 1, 1, new_all_headers.length).setValues([new_all_headers])

  // フォームのメニュー項目について、更新したヘッダー(new_all_headers)と付き合わせてシートの列番号を取得する
  const menu_range = form_sheet.getRange(form_sheet_config.START_MENU_ROW, 3, menu_of_form.length, 2);  // 書き込む範囲を選択
  const menu_array = menu_of_form.map((menu) => [menu, getColumnNumberByTitle(menu, new_all_headers)]); // [メニュー名, 列番号]　を要素にもつ配列(２次元配列)を生成
  debug(`3-5. formシートに転記: ${menu_array}`);
  menu_range.setValues(menu_array);

  // 取得したタイムスタンプから date(年月日) を抽出
  const accepted_date = Utilities.formatDate(timestamp, "JST", "yyyyMMdd");  // 年月日

  // 注文データを格納する配列をletで初期化 (配列に要素の追加による変更が生じるため)
  let order_values = [""];  // 最初の要素は空白に設定

  // 基本情報項目を order_values に追加
  order_values.push(
    accepted_date,              // 注文受付日
    order_id,                   // 注文ID
    received_order[1].answer,   // お届け日
    received_order[2].answer,   // 名前
    received_order[3].answer,   // 住所
    received_order[4].answer,   // メールアドレス
    received_order[5].answer,   // 電話番号
    received_order[received_order.length - 1].answer,   // コメント
  );

  // メニュー項目の回答を order_values に追加
  new_menu_headers.forEach(header => {  // ヘッダーのメニュー要素を一つ一つ取得して、
    const form_res = received_order.find(item => item.question === header);  // 対応するものをreceived_order内から探し出す
    const answer = form_res ? form_res.answer : "";  // 回答があればその回答を、なければ空白文字列を設定
    order_values.push(answer === "0" ? "" : answer);  // 回答が0の場合も空白文字列として設定
  })
  debug(order_values); 

  // 注文データを　order_sheet に追加
  const last_row_number = order_sheet.getLastRow();  // 注文データの追加前に最終行番号を取得しておく
  debug(`4. 注文データ追記前の最終行番号: ${last_row_number}`);

  order_sheet.appendRow(order_values);
  order_sheet.getRange(last_row_number + 1, 1).insertCheckboxes();  // appendRowと同じ行の1列目にチェックボックスを追加


  // 注文内容確認メッセージを注文者本人とadminメンバーのLINEにそれぞれ送信
  cache = makeCache();
  const line_user_id = cache.get(order_id); // キャッシュからLINEユーザーIDを取得
  debug(`6. キャッシュからユーザーIDを取得 : ${line_user_id}`);
  if (line_user_id) {
    // 注文ユーザー本人へ送信
    let to_user_message = `ご注文ありがとうございます。\n以下のご注文を承りました。`;
    to_user_message += createOrderMessage(received_order);
    sendPushMessage(line_user_id, to_user_message);

    // adminメンバー(LINE Notify)へ送信
    let to_admin_message = `\n以下の注文が届きました。`
    to_admin_message += createOrderMessage(received_order);
    notifyToAdmin(to_admin_message);

    // 送信完了したら、キャッシュデータを削除
    cache.remove(order_id);
    debug(`6. キャッシュデータ削除確認 : ${cache.get(order_id)}`);
  }
}
