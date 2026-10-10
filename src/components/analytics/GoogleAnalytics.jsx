import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function GoogleAnalytics({ measurementId = "G-XXXXXXXXXX" }) {
  const location = useLocation();

  useEffect(() => {
    if (!window.gtag) {
      const script1 = document.createElement("script");
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement("script");
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${measurementId}', {
          page_path: window.location.pathname,
          send_page_view: false
        });
      `;
      document.head.appendChild(script2);
    }
  }, [measurementId]);

  useEffect(() => {
    if (window.gtag) {
      window.gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_location: window.location.href,
        page_title: document.title
      });
    }
  }, [location]);

  return null;
}