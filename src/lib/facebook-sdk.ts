let FB_APP_ID = "";
const FB_API_VERSION = "v21.0";

async function fetchAppId(): Promise<string> {
  if (FB_APP_ID) return FB_APP_ID;
  try {
    const res = await fetch("/api/facebook-app-id");
    const data = await res.json();
    FB_APP_ID = data.appId || "";
    return FB_APP_ID;
  } catch (e) {
    console.error("[FB SDK] Failed to fetch App ID:", e);
    return "";
  }
}

export async function initFacebookSDK(): Promise<void> {
  const appId = await fetchAppId();
  if (!appId) {
    console.error("[FB SDK] ❌ No FACEBOOK_APP_ID configured");
    throw new Error("FACEBOOK_APP_ID not configured in environment variables");
  }

  return new Promise((resolve, reject) => {
    if (window.FB) {
      if (!(window.FB as any).__initialized) {
        window.FB.init({
          appId,
          cookie: true,
          xfbml: true,
          version: FB_API_VERSION,
        });
        (window.FB as any).__initialized = true;
        window.FB.AppEvents.logPageView();
        console.log("[FB SDK] ✅ Facebook SDK initialized");
      }
      resolve();
      return;
    }

    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        cookie: true,
        xfbml: true,
        version: FB_API_VERSION,
      });
      (window.FB as any).__initialized = true;
      window.FB.AppEvents.logPageView();
      console.log("[FB SDK] ✅ Facebook SDK initialized");
      resolve();
    };

    const existingScript = document.getElementById("facebook-jssdk");
    if (existingScript) {
      return;
    }

    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.src = "https://connect.facebook.net/en_US/sdk.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log("[FB SDK] script loaded");
    };
    script.onerror = (e) => {
      console.error("[FB SDK] Failed to load SDK script", e);
      reject(new Error("Failed to load Facebook SDK script"));
    };
    document.body.appendChild(script);
  });
}

export function facebookLogin(): Promise<{
  accessToken: string;
  userID: string;
  pages: any[];
}> {
  return initFacebookSDK().then(
    () =>
      new Promise((resolve, reject) => {
        const finishWithPages = (accessToken: string, userID: string) => {
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
        };

        window.FB.getLoginStatus((status: any) => {
          if (status?.status === "connected" && status.authResponse) {
            finishWithPages(status.authResponse.accessToken, status.authResponse.userID);
            return;
          }

          window.FB.login(
            (response: any) => {
              if (response?.authResponse) {
                finishWithPages(response.authResponse.accessToken, response.authResponse.userID);
              } else {
                window.FB.getLoginStatus((retryStatus: any) => {
                  if (retryStatus?.status === "connected" && retryStatus.authResponse) {
                    finishWithPages(retryStatus.authResponse.accessToken, retryStatus.authResponse.userID);
                  } else {
                    reject(new Error("Facebook login was cancelled or blocked. Please allow the popup and try again."));
                  }
                });
              }
            },
            {
              scope: "pages_manage_posts,pages_read_engagement,pages_show_list",
              return_scopes: true,
              auth_type: "rerequest",
              display: "popup",
            }
          );
        });
      })
  );
}

export function checkLoginStatus(): Promise<any> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve({ status: "unknown" });
      return;
    }

    window.FB.getLoginStatus((response: any) => {
      resolve(response);
    });
  });
}

export function facebookLogout(): Promise<void> {
  return new Promise((resolve) => {
    if (!window.FB) {
      resolve();
      return;
    }

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
