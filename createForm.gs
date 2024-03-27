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
    const menuStHeaders = colNumber.menuSt;
    // 「商品名」列における最終行番号を取得 (=　「商品名」列　に着目して、文字列がセットされているセルの数をカウント)
    const lastRow = menuSheet.getRange(1, menuStHeaders.itemName, menuSheet.getLastRow()).getValues().filter(String).length;
    // チェックボックス列において、少なくとも１つのチェックが入っていればtrueを返す
    const isCheckedData = menuSheet.getRange(2, menuStHeaders.isChecked, lastRow - 1, 1).getValues().flat().some(Boolean);
    // チェックされたデータが存在しない場合、エラーダイアログを表示
    if (lastRow === 0 || !isCheckedData) {
        showDialog("Error", "メニューシートにおいて、チェックされた項目が見つかりません。");
        return;  // エラーが発生したため、処理を中断して関数から抜ける
    }

    /** フォーム更新処理を開始 */
    try {
        // menuシートのデータを取得
        const values = menuSheet.getRange(1, 1, lastRow, menuStHeaders.formType).getValues();  // formType列までを取得 (comment列は除く)
        
        const items = form.getItems();
        // 既存の質問項目を出力して確認
        const existingQ = getItemTitles(items);
        console.log("既存の質問項目: ", existingQ.join(", "));

        // 既存の質問項目をすべて削除し、フォームを初期化
        items.forEach(item => form.deleteItem(item));

        // 基本情報に関する質問項目を追加
        // 1. 質問タイトル「注文ID」を設定
        form.addTextItem().setTitle("注文ID").setHelpText("注文管理のためのIDですので、削除や変更を行わないでください。").setRequired(true);
        // 2. 質問タイトル「名前」を設定
        form.addTextItem().setTitle("飲食店名（お名前）").setRequired(true);
        // 3. 質問タイトル「メールアドレス」を設定 (バリデーションを設定)
        form.addTextItem().setTitle("メールアドレス").setRequired(true).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
        // 4. 質問タイトル「お届け日」を設定(現在の日付から30日分を設定する)
        form.addListItem().setTitle("お届け日").setRequired(true).setChoiceValues(generateDaysChoices(30)); 
        // 5. メニューアイテムをフォームに追加
        addMenuItems(values, lastRow, menuStHeaders);

        // 6. 質問タイトル「コメント」を設定
        form.addTextItem().setTitle("コメント");

        // 成功メッセージを表示
        ss.toast("フォームの作成に成功しました。", "成功", 5);

        // メニュー項目を、orderシートのヘッダーに同期
        syncMenuWithOrderHeader(lastRow, menuStHeaders);

    } catch (error) {
        // エラーメッセージを表示
        showDialog("Error", `フォーム更新中にエラーが発生しました。もう一度はじめからやり直してください。\n\n${error.message}`);
    }
}

// /** 基本情報に関する質問項目をフォームに追加する関数(「コメント」を除く) */
// function addBasicFormQuestions(form) {
//     // 1. 質問タイトル　「注文ID」　を設定
//     const qId = form.addTextItem().setTitle("注文ID").setHelpText("注文管理のためのIDですので、削除や変更を行わないでください。").setRequired(true);
//     // 2. 質問タイトル　「名前」　を設定
//     const qName = form.addTextItem().setTitle("飲食店名（お名前）").setRequired(true);
//     // 3. 質問タイトル　「メールアドレス」　を設定 (バリデーションを設定)
//     const qEmail = form.addTextItem().setTitle("メールアドレス").setRequired(true).setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
//     // 4. 質問タイトル　「お届け日」　を設定 (現在の日付から30日分を設定する)
//     const qDeliDate = form.addListItem().setTitle("お届け日").setRequired(true).setChoiceValues(generateDaysChoices(30)); 
// }


/** メニューアイテムをフォームに追加する関数 */
function addMenuItems(values, lastRow, menuStHeaders) {
    for (let i = 0; i < lastRow - 1; i++) {
      // i=0行目はヘッダー行であるため、i=1からスタート & 列番号をインデックスに変換するため　「-1」
      const isChecked = values[i+1][menuStHeaders.isChecked - 1];  // 「チェックボックス」列
      if (isChecked) {
        const itemId = values[i+1][menuStHeaders.itemId - 1];         // 商品ID
        const itemName = values[i+1][menuStHeaders.itemName - 1];     // 品名
        const itemUnit = values[i+1][menuStHeaders.itemUnit - 1];     // 単位
        const itemAmount = values[i+1][menuStHeaders.itemAmount - 1]; // 内容量
        const itemPrice = values[i+1][menuStHeaders.itemPrice - 1];   // 単価
        let itemTitle = itemName;
        if (itemAmount) {
          itemTitle += "（" + itemAmount + "）";
        }
        // itemTitle += `   ¥${itemPrice} /${itemUnit}`;
        const itemDescription = `¥${itemPrice} /${itemUnit}`
        const type = values[i + 1][menuStHeaders.formType - 1];

        // フォーム登録メニュー管理エリアの最終行を取得
        let lastRowOfRegMenu = menuSheet.getRange(1, menuStHeaders.formRegMenu, menuSheet.getLastRow()).getValues().filter(String).length;
          
        let qItem;
        switch (type) {
          case "記述式":
            if (!itemUnit) {
              showDialog("Error", `${itemName} の単位を入力して、もう一度はじめからやり直してください。`);
              clearMenuSheetValues();  // エラーが発生したため、行をクリア
              return;  // エラーが発生したため、処理を中断して関数から抜ける
            }
            qItem = form.addTextItem().setTitle(itemTitle).setHelpText(`${itemDescription}\n\n※「${itemUnit}」単位で、数値のみを入力してください。`);
            qItem.setValidation(FormApp.createTextValidation()
                .setHelpText("半角数値でご入力ください。")
                .requireNumber()
                .build());  // 整数値入力のバリデーションを設定
            menuSheet.getRange(lastRowOfRegMenu + 1, menuStHeaders.formRegMenu, 1, 3).setValues([[qItem.getId(), itemId, itemName]]);
            clearMenuSheetValues();  // エラーが発生したため、行をクリア
            break;        // switch-case文全体から抜ける
          case "プルダウン":
            // プルダウンの選択肢の範囲
            const orderUpperLimit = values[i+1][menuStHeaders.upperLimit - 1];  // 注文数の上限値 (プルダウンのときのみ設定される)
            if (!orderUpperLimit || orderUpperLimit < 1) {
              showDialog("Error", `${itemName} の注文上限値を設定して、もう一度はじめからやり直してください。`);
              return;  // エラーが発生したため、処理を中断して関数から抜ける
            }
            let choiceValues = [];
            for (let j = 1; j <= orderUpperLimit; j++) {
              choiceValues.push([j]);
            }
            qItem = form.addListItem().setTitle(itemTitle).setHelpText(itemDescription).setChoiceValues(choiceValues);
            menuSheet.getRange(lastRowOfRegMenu + 1, menuStHeaders.formRegMenu, 1, 3).setValues([[qItem.getId(), itemId, itemName]]);
            clearMenuSheetValues();  // エラーが発生したため、行をクリア
            break;  // switch-case文全体から抜ける
          default:
            showDialog("Error", `${itemName} の「フォーム形式」の列を設定して、もう一度はじめからやり直してください。`);
            clearMenuSheetValues();  // エラーが発生したため、行をクリア
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
function syncMenuWithOrderHeader(lastRow, menuStHeaders) {
  // 「商品名」列における最終行番号を取得 (=　「商品名」列　に着目して、文字列がセットされているセルの数をカウント)
  // const lastRow = menuSheet.getRange(1, menuStHeaders.itemName, menuSheet.getLastRow()).getValues().filter(String).length;
  console.log(lastRow);

  const cellRange = menuSheet.getRange(2, menuStHeaders.itemId, lastRow - 1, 5);  // menuシートから商品ID、商品名、単位、内容量、単価の項目を取得
  let arr = cellRange.getValues();  //  転記元の内容を二次元配列として格納
  arr = transpose(arr);  // 転置行列に変換し、arrに再格納
  console.log(arr);
  console.log(arr.length, arr[0].length); // arr.length = 5,  arr[0].length = メニュー数

  // 各メニューデータに対して、orderシートの列番号を取得して、menuシートに書き込む
  const orderStColNum = colNumber.orderSt;
  for (let i = 0; i < arr[0].length; i++) {
    const colIdx = orderStColNum.menuStart + i;  // orderシートの列番号を計算

    menuSheet.getRange(i + 2, menuStHeaders.orderStColNumber).setValue(colIdx);
  }

  orderSheet.getRange(1, orderStColNum.menuStart, arr.length, arr[0].length).setValues(arr);

}


function clearMenuSheetValues() {
  let lastRowOfRegMenu = menuSheet.getRange(1, menuStHeaders.formRegMenu, menuSheet.getLastRow()).getValues().filter(String).length;
  const numRows = lastRowOfRegMenu - 3;  // 3行目から最終行までの行数を計算
  if (numRows > 0) {
    menuSheet.getRange(3, menuStHeaders.formRegMenu, numRows, 3).clearContent();
  }
}