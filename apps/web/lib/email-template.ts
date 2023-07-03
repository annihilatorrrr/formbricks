export const withEmailTemplate = (content: string) =>
  `<!DOCTYPE html>
  <html>
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1, minimum-scale=1"
      />
      <base target="_blank" />
  
      <style>
        body {
          background-color: #f1f5f9;
          font-family: "Poppins", "Helvetica Neue", "Segoe UI", Helvetica,
            sans-serif;
          font-size: 15px;
          font-weight: 300;
          line-height: 26px;
          margin: 0;
          color: #1e293b;
        }
  
        pre {
          background: #f4f4f4;
          padding: 2px;
        }

        hr {
          border-top: 1px dashed #94a3b8;
          margin-top: 1rem;
          margin-bottom: 1rem;
        }
  
        table {
          width: 100%;
        }
        table td {
          padding: 5px;
        }
        .socialicons {
          max-width: 200px;
          margin-left: auto;
          margin-right: auto;
          margin-top: 27px;
        }
  
        .wrap {
          background-color: #f8fafc;
          padding: 30px;
          max-width: 525px;
          margin: 0 auto;
          border-radius: 12px;
        }
        
        .brandcolor {
          color: #00c4b8;
        }

        .tooltip {
          background-color: #f1f5f9;
          padding: 1rem;
          border-radius: 1rem;
          color: #475569;
          margin-top: 15px;
          margin-bottom: 15px;
        }

        .tooltip a {
          color: #1e293b;
        }
  
        .button {
          background: #00c4b8;
          border-radius: 8px;
          text-decoration: none !important;
          color: #fff !important;
          font-weight: 600;
          padding: 10px 30px;
          display: inline-block;
        }
        .button:hover {
          background: #00e6ca;
        }
  
        .footer {
          text-align: center;
          font-size: 12px;
          color: #cbd5e1;
        }
        .footer a {
          color: #cbd5e1;
          margin-right: 5px;
        }
  
        .gutter {
          padding: 30px;
          text-align: center;
        }
  
        img {
          max-width: 100%;
          height: auto;
        }
  
        .gutter img {
          max-width: 280px;
        }
  
        a {
          color: #00c4b8;
        }
        a:hover {
          color: #00e6ca;
        }
        h1,
        h2,
        h3,
        h4 {
          font-weight: 600;
        }
        @media screen and (max-width: 600px) {
          .wrap {
            max-width: auto;
          }
          .gutter {
            padding: 10px;
          }
        }
      </style>
    </head>
    <body
      style="
        background-color: #f1f5f9;
        font-family: 'Poppins', 'Helvetica Neue', 'Segoe UI', Helvetica,
          sans-serif;
        font-size: 15px;
        line-height: 26px;
        margin: 0;
        color: #1e293b;
      "
    >
      <div class="gutter" style="padding: 30px">
        <a href="https://formbricks.com" target="_blank">
          <img
            src="https://s3.eu-central-1.amazonaws.com/listmonk-formbricks/Formbricks-Light-transparent.png"
            alt="Formbricks Logo"
        /></a>
      </div>
      <div
        class="wrap"
        style="
          background-color: #f8fafc;
          padding: 30px;
          max-width: 525px;
          margin: 0 auto;
          border-radius: 12px;
        "
      >
        ${content}
      </div>
  
      <div
        class="footer"
        style="text-align: center; font-size: 12px; color: #cbd5e1"
      >
        <table class="socialicons">
          <tr>
            <td>
              <a target="_blank" href="https://twitter.com/formbricks"
                ><img
                  title="Twitter"
                  src="https://s3.eu-central-1.amazonaws.com/listmonk-formbricks/Twitter-transp.png"
                  alt="Tw"
                  width="32"
              /></a>
            </td>
            <td>
              <a target="_blank" href="https://formbricks.com/github"
                ><img
                  title="GitHub"
                  src="https://s3.eu-central-1.amazonaws.com/listmonk-formbricks/Github-transp.png"
                  alt="GitHub"
                  width="32"
              /></a>
            </td>
            <td>
              <a target="_blank" href="https://formbricks.com/discord"
                ><img
                  title="Discord"
                  src="https://s3.eu-central-1.amazonaws.com/listmonk-formbricks/Discord-transp.png"
                  alt="Discord"
                  width="32"
              /></a>
            </td>
          </tr>
        </table>
        <p style="padding-top: 8px; line-height: initial">
          Formbricks ${new Date().getFullYear()}. All rights reserved.<br />
          <a
            style="text-decoration: none"
            href="https://formbricks.com/imprint"
            target="_blank"
            >Imprint</a
          >
          |
          <a
            style="text-decoration: none"
            href="https://formbricks.com/privacy-policy"
            target="_blank"
            >Privacy Policy</a
          >
        </p>
      </div>
    </body>
  </html>
  `;

export const notificationHeader = (productName, startDate, endDate, startYear, endYear) =>
  `
  <div style="display: block; padding: 1rem;">
    <div style="float: left;">
        <h1>Hey 👋</h1>
    </div>
    <div style="float: right;">    
        <p style="text-align: right; margin: 0; font-weight: bold;">Weekly Report for ${productName}</p>
        ${getNotificationHeaderimePeriod(startDate, endDate, startYear, endYear)}
    </div>
  </div>
    
  <br/>
  <br/>
  `;

export const getNotificationHeaderimePeriod = (startDate, endDate, startYear, endYear) => {
  if (startYear == endYear) {
    return `<p style="text-align: right; margin: 0;">${startDate} - ${endDate} ${endYear}</p>`;
  } else {
    return `<p style="text-align: right; margin: 0;">${startDate} ${startYear} - ${endDate} ${endYear}</p>`;
  }
};

export const notificationInsight = (insights) =>
  `<div style="display: block;">
    <table style="background-color: #f1f5f9;">
        <tr>
          <td>
            <p>Live surverys</p>
            <h1>${insights.numLiveSurvey}</h1>
          </td>
          <td>
            <p>Total Displays</p>
            <h1>${insights.totalDisplays}</h1>
          </td>
          <td>
            <p>Total Responses</p>
            <h1>${insights.totalResponses}</h1>
          </td>
          <td>
            <p>Completed</p>
            <h1>${insights.totalCompletedResponses}</h1>
          </td>
          <td>
            <p>Completion %</p>
            <h1>${insights.completionRate.toFixed(2)}%</h1>
          </td>
        </tr>
      </table>
  </div>
`;

export const notificationLiveSurveys = (surverys, environmentId, webUrl) => {
  if (surverys.length == 0) {
    return `

    `;
  } else {
    let liveSurveys = `
      <div style="display: block;">
          <p>Review surverys</p>
        </div>
    `;

    for (const survey of surverys) {
      liveSurveys += `

      <div style="display: block;">
        <h2 style="text-decoration: underline;">${survey.surveyName}</h2>
        ${createSurveyFields(survey.responses)}
        <a class="button" href="${webUrl}/environments/${environmentId}/surveys/${
        survey.id
      }/responses" style="background: black;">View all Responses</a><br/>
      </div>

      <br/><br/>
      `;
    }
    return liveSurveys;
  }
};

const createSurveyFields = (surveryResponse) => {
  let surveyFields = "";
  for (const response of surveryResponse) {
    surveyFields += `
      <p>${response.title}</p>
      <p style="font-weight: bold;">${response.answer}</p>
    `;
  }
  return surveyFields;
};

export const createReminderNotificationBody = (notificationData, webUrl) => {
  return `
    <p>We’d love to send you a Weekly Summary, but you currently there are no surveys running for ${notificationData.productName}.</p>

    <p style="font-weight: bold;">Don’t let a week pass without learning about your users.</p>

    <a class="button" href="${webUrl}/environments/${notificationData.environmentId}/surveys" style="background: black;">Setup a new survey</a>
    
    <br/>
    <p>Need help finding the right survey for your product?</p>

    <p>Pick a 15 minute slot with <a href="https://cal.com/johannes+matti/30">in our CEOs calendar</a> or reply to this email :)</p>
      
    <p>All the best</p>
    <p>The Formbricks Team</p>
  `;
};
