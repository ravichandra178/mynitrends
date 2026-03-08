const FB_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID || "";
const FB_API_VERSION = "v21.0";

export function initFacebookSDK(): Promise<void> {
  return new Promise((resolve) => {
    if (window.FB) {
      resolve();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId: FB_APP_ID,
        cookie: true,
        xfbml: true,
        version: FB_API_VERSION,
      });
      window.FB.AppEvents.logPageView();
      console.log("[FB SDK] ✅ Facebook SDK initialized");
      resolve();
    };

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  });
}

export function facebookLogin(): Promise<{
  accessToken: string;
  userID: string;
  pages: any[];
}> {
  return new Promise((resolve, reject) => {
    window.FB.login(
      (response: any) => {
        if (response.authResponse) {
          const { accessToken, userID } = response.authResponse;
          console.log("[FB SDK] ✅ User logged in, fetching pages...");

          window.FB.api(
            "/me/accounts",
            { fields: "id,name,access_token,category" },
            (pagesResponse: any) => {
              if (pagesResponse.data) {
                console.log(`[FB SDK] ✅ Found ${pagesResponse.data.length} pages`);
                resolve({
                  accessToken,
                  userID,
                  pages: pagesResponse.data,
                });
              } else {
                reject(new Error("No pages found"));
              }
            }
          );
        } else {
          reject(new Error("Facebook login cancelled"));
        }
      },
      {
        scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
      }
    );
  });
}

export function checkLoginStatus(): Promise<any> {
  return new Promise((resolve) => {
    window.FB.getLoginStatus((response: any) => {
      resolve(response);
    });
  });
}

export function facebookLogout(): Promise<void> {
  return new Promise((resolve) => {
    window.FB.logout(() => {
      console.log("[FB SDK] ✅ User logged out");
      resolve();
    });
  });
}

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}
