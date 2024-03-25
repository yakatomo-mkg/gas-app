/**
 * メニューDBシートからのフォーム更新操作に基づいて、フォームのメニュー項目を更新する
 */
function updateOrderForm() {
    const formTitle = form.getTitle();
    const message = `\n${formTitle}\n\n上記のフォームを更新しても良いですか？`;
    // 確認ダイアログの表示
    if (!confirm(message)) return;  // 「いいえ」が選択された場合、処理を中断して関数から抜ける

    /** =======「はい」が選択された場合の処理 ======== */
    /** menuシートのエラーハンドリング */
    const mS = MENU_SHEET_SETTINGS;
    // 「商品名」列における最終行番号を取得 (=　「商品名」列　に着目して、文字列がセットされているセルの数をカウント)
    const lastRow = menuSheet.getRange(1, mS.itemNameCol, menuSheet.getLastRow()).getValues().filter(String).length;
    // チェックボックス列において、少なくとも１つのチェックが入っていればtrueを返す
    const isCheckedData = menuSheet.getRange(2, mS.ckBoxCol, lastRow - 1, 1).getValues().flat().some(Boolean);
    // チェックされたデータが存在しない場合、エラーダイアログを表示
    if (lastRow === 0 || !isCheckedData) {
        showDialog("Error", "メニューシートにおいて、チェックされた項目が見つかりません。");
        return;  // エラーが発生したため、処理を中断して関数から抜ける
    }

    /** フォーム更新処理を開始 */
    try {
        // menuシートのデータを取得
        const values = menuSheet.getRange(1, 1, lastRow, mS.formTypeCol).getValues();  // formType列までを取得 (comment列は除く)
        
        const items = form.getItems();
        // 既存の質問項目を出力して確認
        const existingQ = getItemTitles(items);
        console.log("既存の質問項目: ", existingQ.join(", "));

        // 既存の質問項目をすべて削除し、フォームを初期化
        items.forEach(item => form.deleteItem(item));

        // 基本情報に関する質問項目を追加
        addBasicQuestions(form);
        // 5. メニューアイテムをフォームに追加
        addMenuItems(values, lastRow, mS);

        // 6. 質問タイトル「コメント」を設定
        form.addTextItem().setTitle("コメント");
      
        // メニュー項目を、orderシートのヘッダーに同期
        syncMenuWithOrderHeader(lastRow, mS);

        // orderシートにおける列番号を取得して、menuシートの管理エリアに出力
        getColNumberAtOrderSheet(lastRow, mS);

        // 成功メッセージを表示
        ss.toast("フォームの作成に成功しました。", "成功", 5);

    } catch (error) {
        // エラーメッセージを表示
        showDialog("Error", `フォーム更新中にエラーが発生しました。もう一度はじめからやり直してください。\n\n${error.message}`);
        clearMenuSheetValues(mS, lastRow);  // 途中でエラーが発生して中断したら、当該エリアをクリア
    }
}

/** 基本情報に関する質問項目をフォームに追加する関数(「コメント」を除く) */
function addBasicQuestions(form) {
    // 1. 質問タイトル　「注文ID」　を設定
    form.addTextItem().setTitle("注文ID").setHelpText("注文管理のためのIDですので、削除や変更を行わないでください。").setRequired(true);
    // 2. 質問タイトル　「名前」　を設定
    form.addTextItem().setTitle("飲食店名（お名前）").setRequired(true);
    // 3. 質問タイトル　「メールアドレス」　を設定 (バリデーションを設定)
    form.addTextItem().setTitle("メールアドレス").setRequired(true).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
    // 4. 質問タイトル　「お届け日」　を設定 (現在の日付から30日分を設定する)
    form.addListItem().setTitle("お届け日").setRequired(true).setChoiceValues(generateDaysChoices(30)); 
}


/** メニューアイテムをフォームに追加する関数 */
function addMenuItems(values, lastRow, mS) {

  /** フォーム登録メニュー管理エリアを初期化 */
  clearMenuSheetValues(mS);

  for (let i = 0; i < lastRow - 1; i++) {
    // i=0行目はヘッダー行であるため、i=1からスタート & 列番号をインデックスに変換するため　「-1」
    const isChecked = values[i+1][mS.ckBoxCol - 1];  // 「チェックボックス」列
    if (isChecked) {
      const itemId = values[i+1][mS.itemIdCol - 1];         // 商品ID
      const itemName = values[i+1][mS.itemNameCol - 1];     // 品名
      const itemUnit = values[i+1][mS.itemUnitCol - 1];     // 単位
      const itemAmount = values[i+1][mS.itemAmtCol - 1]; // 内容量
      const itemPrice = values[i+1][mS.itemPriceCol - 1];   // 単価
      let itemTitle = itemName;
      if (itemAmount) {
        itemTitle += "（" + itemAmount + "）";
      }
      // itemTitle += `   ¥${itemPrice} /${itemUnit}`;
      const itemDescription = `¥${itemPrice} /${itemUnit}`
      const type = values[i + 1][mS.formTypeCol - 1];

      // orderフォーム管理エリアにおける最終行を取得
      let lastRowFmArea = getLastRowInRange(menuSheet, mS.fmStartCol, mS.fmStartCol + 3, lastRow);

      let qItem;
      switch (type) {
        case "記述式":
          if (!itemUnit) {
            showDialog("Error", `${itemName} の単位を入力して、もう一度はじめからやり直してください。`);
            return;  // エラーが発生したため、処理を中断して関数から抜ける
          }
          qItem = form.addTextItem().setTitle(itemTitle).setHelpText(`${itemDescription}\n\n※「${itemUnit}」単位で、数値のみを入力してください。`);
          qItem.setValidation(FormApp.createTextValidation()
              .setHelpText("半角数値でご入力ください。")
              .requireNumber()
              .build());  // 整数値入力のバリデーションを設定
          menuSheet.getRange(lastRowFmArea + 1, mS.fmStartCol, 1, 3).setValues([[qItem.getId(), itemId, itemName]]);
          break;        // switch-case文全体から抜ける
        case "プルダウン":
          // プルダウンの選択肢の範囲
          const orderUpperLimit = values[i+1][mS.upperLimitCol - 1];  // 注文数の上限値 (プルダウンのときのみ設定される)
          if (!orderUpperLimit || orderUpperLimit < 1) {
            showDialog("Error", `${itemName} の注文上限値を設定して、もう一度はじめからやり直してください。`);
            return;  // エラーが発生したため、処理を中断して関数から抜ける
          }
          let choiceValues = [];
          for (let j = 1; j <= orderUpperLimit; j++) {
            choiceValues.push([j]);
          }
          qItem = form.addListItem().setTitle(itemTitle).setHelpText(itemDescription).setChoiceValues(choiceValues);
          menuSheet.getRange(lastRowFmArea + 1, mS.fmStartCol, 1, 3).setValues([[qItem.getId(), itemId, itemName]]);
          break;  // switch-case文全体から抜ける
        default:
          showDialog("Error", `${itemName} の「フォーム形式」の列を設定して、もう一度はじめからやり直してください。`);
          return;  // エラーが発生したため、処理を中断して関数から抜ける
      }
    } 
  }
}


/** 確認ダイアログを表示し、「はい」　ボタンが押された場合にのみ　true　を返す関数 */
function confirm(message) {
  const ui = SpreadsheetApp.getUi();
  return ui.alert(message, ui.ButtonSet.YES_NO) === ui.Button.YES;
}


/** 質問項目のタイトルを取得する関数 */
function getItemTitles(items) {
  let itemTitles = [];
  for (let i = 0; i < items.length; i++) {
    const title = items[i].getTitle();
    itemTitles.push(title);
  }
  return itemTitles;
}


/** エラー発生時に、バインドされているフォームにエラーメッセージを表示する関数 */
function showDialog(title, message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert(title, message, ui.ButtonSet.OK);
}


/**
 * 転置関数の定義
 * 1. matrix[0].map((_, colIdx) => { ... }) : 最初の行を基準に各列をマッピング
 * 2. matrix.map(row => row[colIdx])        : 各行のcolIdx列目の値を新しい行としてマッピング
 */
const transpose = matrix => matrix[0].map((_, colIdx) => matrix.map(row => row[colIdx]));  // 行と列を入れ替える

/** menuシートのメニュー項目をorderシートのヘッダーに同期する関数 */
function syncMenuWithOrderHeader(lastRow, mS) {
  // 「商品名」列における最終行番号を取得 (=　「商品名」列　に着目して、文字列がセットされているセルの数をカウント)
  // const lastRow = menuSheet.getRange(1, mS.itemNameCol, menuSheet.getLastRow()).getValues().filter(String).length;
  console.log(lastRow);

  const cellRange = menuSheet.getRange(2, mS.itemIdCol, lastRow - 1, 5);  // menuシートから商品ID、商品名、単位、内容量、単価の項目を取得
  let arr = cellRange.getValues();  //  転記元の内容を二次元配列として格納
  arr = transpose(arr);  // 転置行列に変換し、arrに再格納
  console.log(arr);
  console.log(arr.length, arr[0].length); // arr.length = 5,  arr[0].length = メニュー数

  // 各メニューデータに対して、orderシートの列番号を取得して、menuシートに書き込む
  const orS = ORDER_SHEET_SETTINGS;
  for (let i = 0; i < arr[0].length; i++) {
    const colIdx = orS.menuStartCol + i;  // orderシートの列番号を計算
    menuSheet.getRange(i + 2, mS.orderCol).setValue(colIdx);
  }
  orderSheet.getRange(1, orS.menuStartCol, arr.length, arr[0].length).setValues(arr);
}


function addMenuToOrderHeader(mS) {

}


/** menuシートのフォームメニュー管理エリアにおいて、商品IDをもとにorderシートの列番号を取得してくる関数 */
function getColNumberAtOrderSheet(lastRow, mS) {
  // フォームメニュー管理エリアの最終行を取得
  let lastRowFmArea = getLastRowInRange(menuSheet, mS.fmStartCol, mS.fmStartCol + 3, lastRow);
  console.log(lastRowFmArea);
  // 当該エリアの範囲を取得
  const range = menuSheet.getRange(mS.fmStartRow, mS.fmStartCol, lastRowFmArea - mS.fmStartRow + 1, 4);  // 4列分
  const values = range.getValues();
  console.log(values);
  /**  values:
   * [ [ 1715639292, 'id001', '野菜セットS', '' ],
   * [ 481307191, 'id003', '野菜セットL', '' ],
   * [ 1589198409, 'id005', 'ジャガイモ', '' ],
   * [ 989930047, 'id007', 'にんじん', '' ],
   * [ 387438721, 'id008', 'にんじん', '' ] ]
   */
  const itemIdRange = menuSheet.getRange(2, mS.itemIdCol, lastRow, 1).getValues();  // menuシートのitemId列を二次元配列として取得

  for (let i = 0; i < values.length; i++) {
    const itemId = values[i][1];
    // menuシートのmenu_dbエリアとフォームメニュー管理エリアの商品IDを照合
    const rowIdx = itemIdRange.findIndex(row => row[0] === itemId) + 2;  // index番号に「2」を加えて行番号に変換
    console.log(rowIdx);
    
    if (rowIdx > 1) { // 照合先のmenu_dbエリアにおけるorderCol列の値を取得
      const orderColValue = menuSheet.getRange(rowIdx, mS.orderCol).getValue();
      menuSheet.getRange(mS.fmStartRow + i, mS.fmStartCol + 3).setValue(orderColValue);  // fmStartCol列の3列右にズレた列に値をセット
    }
  }
}


/** menuシートの、フォームメニュー管理エリアを初期化する関数 */
function clearMenuSheetValues(mS, lastRow) {
  let lastRowFmArea = getLastRowInRange(menuSheet, mS.fmStartCol, mS.fmStartCol + 3, lastRow);
  const numRows = lastRowFmArea - mS.fmStartRow + 1;  // 3行目から最終行までの行数を計算
  if (numRows > 0) {
    menuSheet.getRange(mS.fmStartRow, mS.fmStartCol, numRows, 4).clearContent(); // 4列分を消去
  }
}