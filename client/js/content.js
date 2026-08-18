(() => {
  const API_URL = window.API_URL || "http://localhost:3000/api";

  const getValue = (object, path) =>
    path.split(".").reduce((value, key) => value?.[key], object);

  const normalize = (raw) => {
    const source =
      raw?.content &&
      typeof raw.content === "object" &&
      !Array.isArray(raw.content)
        ? raw.content
        : {};

    const records = Array.isArray(raw?.records)
      ? raw.records
      : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
          ? raw
          : [];

    const result = { ...source };

    Object.entries(result).forEach(([page, value]) => {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        value[page] &&
        typeof value[page] === "object" &&
        !Array.isArray(value[page])
      ) {
        result[page] = value[page];
      }
    });

    records.forEach((record) => {
      if (!record || typeof record !== "object") return;

      const page = record.page || record.slug || record.section;

      const key =
        record.key || record.content_key || record.field || record.name;

      if (!page || !key) return;

      if (
        !result[page] ||
        typeof result[page] !== "object" ||
        Array.isArray(result[page])
      ) {
        result[page] = {};
      }

      let value = record.value ?? record.content_value ?? record.content ?? "";

      const type = record.type || record.content_type;

      if (type === "json" && typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep the original value.
        }
      }

      result[page][key] = value;
    });

    return result;
  };

  const setText = (element, value) => {
    if (!element || value === undefined || value === null) return;

    const textNode = [...element.childNodes].find(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
    );

    if (textNode) {
      textNode.textContent = ` ${value}`;
    } else {
      element.appendChild(document.createTextNode(` ${value}`));
    }
  };

  const setTextAll = (selector, value) => {
    if (value === undefined || value === null) return;

    document
      .querySelectorAll(selector)
      .forEach((element) => setText(element, value));
  };

  const setInput = (selector, value) => {
    if (value === undefined || value === null) return;

    const element = document.querySelector(selector);

    if (element) {
      element.setAttribute("placeholder", value);
    }
  };

  const applyNavigation = (content) => {
    const navigation = content.navigation || {};

    const links = {
      "index.html": navigation.home,
      "rooms.html": navigation.rooms,
      "booking.html": navigation.booking,
      "reserve.html": navigation.reservations,
      "deals.html": navigation.deals,
      "events.html": navigation.events,
      "contact.html": navigation.contact,
      "register.html": navigation.register,
      "login.html": navigation.login,
    };

    Object.entries(links).forEach(([href, value]) => {
      if (value === undefined || value === null) return;

      document
        .querySelectorAll(`nav a[href="${href}"]`)
        .forEach((link) => setText(link, value));
    });

    document
      .querySelectorAll('nav a[onclick*="goToDashboard"]')
      .forEach((link) => {
        if (navigation.dashboard !== undefined) {
          setText(link, navigation.dashboard);
        }
      });
  };

  const applyFooter = (content) => {
    const footer = content.footer || {};
    const contact = content.contact || {};

    setTextAll(".footer-bottom p", footer.copyright);

    document
      .querySelectorAll(".footer-bottom-links a")
      .forEach((link, index) => {
        const values = [
          [footer.privacy_label, footer.privacy_url],
          [footer.terms_label, footer.terms_url],
          [footer.cookie_label, footer.cookie_url],
        ];

        const [label, url] = values[index] || [];

        if (label !== undefined) {
          setText(link, label);
        }

        if (url !== undefined) {
          link.href = url;
        }
      });

    document.querySelectorAll('.footer a[href^="tel:"]').forEach((link) => {
      if (!contact.phone) return;

      link.href = `tel:${contact.phone.replace(/[^\d+]/g, "")}`;
      setText(link, contact.phone);
    });

    document.querySelectorAll('.footer a[href^="mailto:"]').forEach((link) => {
      if (!contact.email) return;

      link.href = `mailto:${contact.email}`;
      setText(link, contact.email);
    });

    document
      .querySelectorAll('.footer span[style*="--gold"]')
      .forEach((element) => {
        if (contact.location) {
          setText(element, contact.location);
        }
      });
  };

  const applyHome = (content) => {
    const home = content.home || {};

    const hero = document.querySelector(".hero");
    const heroTitle = document.querySelector(".hero h1");
    const heroText = document.querySelector(".hero p");
    const heroLink = document.querySelector(".hero a.btn");

    if (heroTitle && home.headline) {
      setText(heroTitle, home.headline);
    }

    if (heroText && home.subheadline) {
      setText(heroText, home.subheadline);
    }

    if (heroLink) {
      if (home.cta_primary) {
        setText(heroLink, home.cta_primary);
      }

      if (home.cta_primary_url) {
        heroLink.href = home.cta_primary_url;
      }
    }

    if (hero && home.hero_image_url) {
      hero.style.setProperty("--hero", `url('${home.hero_image_url}')`);
    }

    const services = document.querySelectorAll(".service-list li");

    [1, 2, 3, 4, 5].forEach((number, index) => {
      const value = home[`service_${number}`];

      if (value && services[index]) {
        setText(services[index], value);
      }
    });

    const quickLink = document.querySelector(".quick-links a");

    if (quickLink) {
      if (home.quick_link_label) {
        setText(quickLink, home.quick_link_label);
      }

      if (home.quick_link_url) {
        quickLink.href = home.quick_link_url;
      }
    }
  };

  const applyContact = (content) => {
    const contact = content.contact || {};

    const heading = document.querySelector("body > h1");

    if (heading && document.querySelector("form #name")) {
      if (contact.title) {
        setText(heading, contact.title);
      }
    }

    setInput("#name", contact.name_placeholder);
    setInput("#email", contact.email_placeholder);
    setInput("#subject", contact.subject_placeholder);
    setInput("#message", contact.message_placeholder);

    const submit = document.querySelector(
      'form button[onclick*="submitContact"]',
    );

    if (submit && contact.submit_label) {
      setText(submit, contact.submit_label);
    }
  };

  const applySeo = (content) => {
    const seo = content.seo || {};

    const description = document.querySelector('meta[name="description"]');

    if (description && seo.site_description) {
      description.content = seo.site_description;
    }

    const keywords = document.querySelector('meta[name="keywords"]');

    if (keywords && seo.home_keywords) {
      keywords.content = seo.home_keywords;
    }

    const ogImage = document.querySelector('meta[property="og:image"]');

    if (ogImage && seo.og_image_url) {
      ogImage.content = seo.og_image_url;
    }

    if (seo.site_title && location.pathname.endsWith("/index.html")) {
      document.title = seo.site_title;
    }
  };

  async function loadContent() {
    try {
      const response = await fetch(`${API_URL}/content`, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Content API returned ${response.status}`);
      }

      const raw = await response.json();
      const content = normalize(raw);

      window.hotelContent = content;

      applyNavigation(content);
      applyFooter(content);
      applyHome(content);
      applyContact(content);
      applySeo(content);

      document.dispatchEvent(
        new CustomEvent("hotel:content-loaded", {
          detail: content,
        }),
      );

      console.log("[Content] CMS content applied:", content);
    } catch (error) {
      console.error("[Content] Failed to load CMS content:", error);
    }
  }

  window.hotelContentLoader = {
    load: loadContent,

    get: (path) => getValue(window.hotelContent || {}, path),
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadContent);
  } else {
    loadContent();
  }
})();
