/**
 * 参考サイト: https://uncle-gas.com/gas-html-order-form/#google_vignette
 * 
 * 作成途中 :
 * - 「確認画面ページの「発注する」ボタンクリック後の機能を実装しよう」
 * - createOrder()およびsendMail()関数の実装が未実施
 */

// GETリクエストを受け取ったときに発火する関数
function doGet(e) {
  const items = getAllRecords('menu_db');

  // index.htmlファイルから生成されたHtmlTemplateオブジェクトを変数templateに代入
  const template = HtmlService.createTemplateFromFile('index');
  template.deployURL = ScriptApp.getService() .getUrl();  // 最新のデプロイURLを取得
  template.formHTML = getFormHTML(e, items);
  // HtmlTemplateオブジェクトをevaluateすることでHtmlPutputオブジェクトに変換 -> 変換後のオブジェクトを変数htmlOutputに代入
  const htmlOutput = template.evaluate();
  htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');  // モバイル対応のページ設定
  return htmlOutput;
}


// POSTリクエストを受け取ったときに発火する関数
function doPost(e) {
  const items = getAllRecords('menu_db');

  // 注文数量が入力されていない場合(全部ゼロの場合)、alert付きでindex.htmlを返す
  if (isZero(e, items)) {
    const template = HtmlService.createTemplateFromFile('index');
    const alert = '少なくとも1個以上注文してください。';
    template.deployURL = ScriptApp.getService().getUrl();
    template.formHTML = getFormHTML(e, items, alert);
    const htmlOutput = template.evaluate();
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');  // モバイル対応のページ設定
    return htmlOutput;
  }

  // 注文画面(index.html)で、「確認画面へ」ボタンが押されたらconfirm.htmlへ
  if (e.parameter.confirm) {
    const template = HtmlService.createTemplateFromFile('confirm');
    template.deployURL = ScriptApp.getService().getUrl();
    template.confirmHTML = getConfirmHTML(e, items);
    const htmlOutput = template.evaluate();
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');  // モバイル対応のページ設定
    return htmlOutput;
  }

  // confirm.htmlで、「修正する」ボタンが押されたら、index.htmlへ
  if (e.parameter.modify) {
    const template = HtmlService.createTemplateFromFile('index');
    template.deployURL = ScriptApp.getService().getUrl();
    template.formHTML = getFormHTML(e, items);
    const htmlOutput = template.evaluate();
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');  // モバイル対応のページ設定
    return htmlOutput;
  }

  // confirm.htmlで、「発注する」ボタンが押されたらcomplete.htmlへ
  if (e.parameter.submit) {
    createOrder(e, items);     // orderシートに注文内容をセットする
    sendMailToCustomer(e.items);  // LINEで注文受付メッセージ送信
    const template = HtmlService.createTemplateFromFile('complete');
    template.deployURL = ScriptApp.getService().getUrl();
    const htmlOutput = template.evaluate();
    htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');  // モバイル対応のページ設定
    return htmlOutput;
  }
}


/** 引数で指定したシートから、商品情報を取得する関数 */
function getAllRecords(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const values = sheet.getDataRange().getValues();
  const labels = values.shift(); // valuesから最初の行を取り出してlabelsに格納
  console.log(values);
  /** values出力例: 
 	[ [ true, 1, '玉ねぎ', '300g', 'P', 300, 50, '' ],
  [ true, 2, 'ジャガイモ', '250g', 'P', 400, 50, '' ],
  [ false, 3, 'サニーレタス', '', '個', 200, 50, '' ],
  [ true, 4, 'にんじん', '', 'P', 250, 50, '' ],
  [ true, 5, 'ほうれん草', '150g', 'P', 200, 50, '' ] ]
   */

  const records = [];
  for (const value of values) { // value: 各行データ(menuデータ)
    const record = {};  // 整形した各行データを保持するための配列
    labels.forEach((label, index) => {
      record[label] = value[index];
    });
    records.push(record);
  }
  console.log(records);
  /** recordsの出力例: 
	[ { 'フォーム登録': true,
    '商品ID': 1,
    '商品名': '玉ねぎ',
    '内容量': '300g',
    '単位': 'P',
    '単価': 300,
    '注文上限値': 50,
    Comment: '' },
  { 'フォーム登録': true,
    '商品ID': 2,
    '商品名': 'ジャガイモ',
    '内容量': '250g',
    '単位': 'P',
    '単価': 400,
    '注文上限値': 50,
    Comment: '' },
  { 'フォーム登録': false,
    '商品ID': 3,
    '商品名': 'サニーレタス',
    '内容量': '',
    '単位': '個',
    '単価': 200,
    '注文上限値': 50,
    Comment: '' },
  { 'フォーム登録': true,
    '商品ID': 4,
    '商品名': 'にんじん',
    '内容量': '',
    '単位': 'P',
    '単価': 250,
    '注文上限値': 50,
    Comment: '' },
  { 'フォーム登録': true,
    '商品ID': 5,
    '商品名': 'ほうれん草',
    '内容量': '150g',
    '単位': 'P',
    '単価': 200,
    '注文上限値': 50,
    Comment: '' } ]
   */
  return records;
}


// function doGetAllRecords() {
//   getAllRecords('menu_db');
// }



function getFormHTML(e, items, alert='') {
  const orderId = e.parameter['order-id'] ? e.parameter['order-id'] : '';
  const deliveryDate = e.parameter['delivery-date'] ? e.parameter['delivery-date'] : '';
  const email = e.parameter.email ? e.parameter.email : '';
  const username = e.parameter.username ? e.parameter.username : '';

  let html = `
    <div class="mb-3">
      <label for="order-id" class="form-label">注文ID</label>
      <input type="text" class="form-control" id="order-id" name="order-id" required value="${orderId}">
    </div>

    <div class="mb-3">
      <label for="delivery-date" class="form-label">お届け日</label>
      <input type="date" class="form-control" id="delivery-date" name="delivery-date" required value="${deliveryDate}">
    </div>

    <div class="mb-3">
      <label for="username" class="form-label">お名前（飲食店名）</label>
      <input type="text" class="form-control" id="username" name="username" required value="${username}">
    </div>

    <div class="mb-3">
      <label for="email" class="form-label">Email</label>
      <input type="email" class="form-control" id="email" name="email" required value="${email}">
    </div>

    <p class="mt-5 mb-3">商品の個数を入力してください。</p>
    <p class="text-danger">${alert}</p>

    <table class="table">
      <thead>
        <tr>
          <th scope="col">商品</th>
          <th scope="col">内容量</th>
          <th scope="col">単価</th>
          <th scope="col">数量</th>
          <th scope="col">単位</th>
        </tr>
      </thead>
      <tbody>
  `;

  for(const item of items) {
    const isChecked = item['フォーム登録'];
    const itemId = item['商品ID'];
    const itemName = item['商品名'];
    const itemAmount = item['内容量'];
    const itemUnit = item['単位'];
    const unitPrice = item['単価'];
    const upperLimit = item['注文上限値'];

    // 「フォーム登録」の列にチェックされた項目のみをフォームに表示
    if(isChecked) {  
      html += `<tr>`;
      html += `<td class="align-middle">${itemName}</td>`;
      html += `<td class="align-middle">${itemAmount}</td>`;
      html += `<td class="align-middle">@¥${unitPrice.toLocaleString()}</td>`;
      html += `<td>`;
      html += `<select class="form-select" name="${itemId}">`;  // 選択肢を持つセレクトボックス(ドロップダウンリスト)の作成
      
      // 注文可能数量の選択肢を生成するループ関数
      for(let i = 0; i <= upperLimit; i++) {
        if(i == Number(e.parameter[itemId])) {
          // 注文数量が選択されている場合 -> selected属性を追加 (=選択状態を表す)
          html += `<option value="${i}" selected>${i}</option>`;
        } else {
          // 注文数量が選択されていない場合 -> selected属性なし (=未選択状態を表す)
          html += `<option value="${i}">${i}</option>`;
        }
      }

      html += `</select>`;
      html += `</td>`;
      html += `<td class="align-middle">${itemUnit}</td>`;
      html += `</tr>`;
    }
  }

  html += `</tbody>`;
  html += `</table>`;

  return html;
}



function getConfirmHTML(e, items) {
  let html = `
    <div class="mb-3">
      <label for="username" class="form-label">お名前</label>
      <input type="text" class="form-control" id="username" name="username" required value="${e.parameter.username}" readonly>
    </div>
    
    <div class="mb-3">
      <label for="email" class="form-label">Email</label>
      <input type="email" class="form-control" id="email" name="email" required value="${e.parameter.email}" readonly>
    </div>



    <p class="mt-5 mb-3 fw-bold">以下の内容で発注していいですか？</p>

    <table class="table">
      <thead>
        <tr>
          <th scope="col" class="text-start">商品</th>
          <th scope="col" class="text-end">単価</th>
          <th scope="col" class="text-end">個数</th>
          <th scope="col" class="text-end">金額</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = 0;
  for(const item of items) {
    const itemId = item['商品ID'];
    const itemName = item['商品名'];
    // const itemUnit = item['単位'];
    const unitPrice = item['単価'];
    const count = Number(e.parameter[itemId]);


    if(count > 0) {
      const price = unitPrice * count;

      console.log(price);
      
      total += price;

      html += `<tr>`;
      html += `<td class="text-start">${itemName}</td>`;
      html += `<td class="text-end">@¥${unitPrice.toLocaleString()}</td>`;
      html += `<td class="text-end">`;
      html += `<div class="d-flex justify-content-end">`;
      html += `<input type="number" style="max-width: 100px; min-width: 60px;" class="form-control text-end" name="${itemId}" required value="${count}" readonly>`;
      html += `</div>`;
      html += `</td>`;
      html += `<td class="text-end">¥${price.toLocaleString()}</td>`;
      html += `</tr>`;
    }
  }

  html += `<tr>`;
  html += `<td class="text-end fs-4 mt-3" colspan="2">合計（税抜価格）： </td>`;
  html += `<td class="text-end fs-4" colspan="2">¥${total.toLocaleString()}</td>`;
  html += `</tr>`;
  html += `</tbody>`;
  html += `</table>`;

  return html;
}


/** 注文数量がゼロの場合を検知する関数 */
function isZero(e, items) {

  let total = 0;  // 合計数量の初期化

  // 商品リストの各アイテムについてループ
  for (const item of items) {
    const itemId = item['商品ID'];  // 商品IDの取得
    const count = Number(e.parameter[itemId]);  // 注文数量の取得

    if (count) total += count;  // 注文数量がゼロでない場合、合計に加算
  }
  if (total == 0) return true;  // 合計がゼロの場合はtrueを返す
  return false;
}


function createOrder(e, items) {
  // 注文テーブルに単一レコードを追加する
  const orderId = getneratedId();
}





