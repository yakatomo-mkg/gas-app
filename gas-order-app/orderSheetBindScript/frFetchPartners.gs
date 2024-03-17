/******************************************************************
 * 取引先一覧を取得して、スプレッドシートに転記する
******************************************************************/

/**
 * 【メイン関数】 取引先一覧を取得してシートにセットする関数 
 * @returns {void} 何も返さない (シートに値がセットされるのみ)
 */
function fetchPartnersList() {
  // セットする起点セル「B4」の指定
  const partners_start_row = 4;    // 起点(行)
  const partners_start_column = 2;    // 起点(列)

  // common.gsで自社情報を定数化することにするため、コメントアウト
  // const own_company_id = getCompanyId_(own_company_name);  // 事業所名をもとに事業所IDを取得

  // freee　API　から取引先一覧を取得
  const access_token = getFreeeOAuth2Service().getAccessToken();
  const request_url = `${BASE_URL}/api/1/partners?company_id=${own_company_id}`;  // 自社IDをAPIエンドポイントのクエリパラメータに設定
  const response = accessFreeeAPI_(access_token, request_url);
  const partners = response.partners;  // レスポンスデータからpartnersプロパティを抜き出す
  

  // 取引先一覧をスプレッドシートに転記する
  if (partners && partners.length > 0) { // null, undefined, 要素数が0である場合を除外
    const partnar_values = partners.map(partner => [partner.name, partner.id]);
    partners_sheet.getRange(partners_start_row, partners_start_column, partnar_values.length, partnar_values[0].length).setValues(partnar_values);
  }
}


/** 
 * 指定のURLにGETリクエストを送信してレスポンスを返す関数
 * @param   {String} アクセストークン
 * @param   {String} リクエストURL
 * @returns {object} freeeAPIのレスポンスデータ
 */
function accessFreeeAPI_(access_token, url) {
  // APIへのアクセス間隔を設定してAPIコールの回数を制限
  Utilities.sleep(1000);  // 1秒待機

  const options = {
    method: 'get',
    headers: {'Authorization': 'Bearer ' + access_token},
    muteHttpExceptions: true  // エラー全文表示
  };

  // HTTPレスポンスオブジェクトを取得
  const res = UrlFetchApp.fetch(url, options);
  // HTTPレスポンスオブジェクトの解析 (= String型にエンコードした後(getContentText)、JavaScriptオブジェクトに変換(parse))
  const res_data = JSON.parse(res.getContentText());

  return res_data;
}


/**
 * 【参考】 事業所名一覧を取得して、シートに転記する関数 
 * @returns {void} 何も返さない (シートに値がセットされるのみ)
 */
const getOwnCompanyList = () => {

  // 転記する起点セル(B11)の指定
  const partners_start_row = 11;
  const partners_start_column = 5;

  const access_token = getFreeeOAuth2Service().getAccessToken();
  const request_url = `${BASE_URL}/api/1/companies`;
  const response = accessFreeeAPI_(access_token, request_url);
  const companies = response.companies;  // レスポンスデータからcompaniesプロパティを抜き出す

  // 事業所一覧をスプレッドシートに転記する
  if (companies && companies.length > 0) {
    const companies_value = companies.map(company => [company.name, company.id]);
    partners_sheet.getRange(partners_start_row, partners_start_column, companies_value.length, 2).setValues(companies_value);
  }

}


// /**
//  * 【参考】 指定した事業所名から事業所IDを返す関数
//  * @param   {String} 事業所名
//  * @returns {String} 事業所ID
//  */
// const getCompanyId_ = (company_name) => {
//   const access_token = getFreeeOAuth2Service().getAccessToken();
//   const request_url = `${BASE_URL}/api/1/companies`;

//   const companies_data = accessFreeeAPI_(access_token, request_url);

//   let company_id;
//   if (companies_data && companies_data.length > 0) {
//     const company = companies_data.find(company => company.name === company_name);
//     if (company) {
//       company_id = company.id;
//     }
//   }
//   return company_id;
// }

