function createMutationObservers (htmlObject){

    var obs = new MutationObserver(function (mutationsList, observer) {
        for (var i = 0; i <= mutationsList.length; i++) {
        var mutation = mutationsList[i];
        // The mutation object is quite a complex one, so we filter out a lot of cases here and do some checks to avoid having to do them later.
        if (mutation === undefined || mutation.addedNodes === undefined || mutation.addedNodes.length === 0 || mutation.target === undefined || mutation.target.parentElement.parentElement === null) {
            continue;
        }
        // 'Show Messagebox' rule in K2
        if (mutation.target.className !== undefined && mutation.target.className === "popup-footer-c") {
            updateTranslations(htmlObject, ".popup-header-text, .panel-header-text, div.message, .popup-footer-c > a");
        } else if (mutation.target.className !== undefined && mutation.target.className === "drop-menu") {
            // Dropdown menu
            updateTranslations(htmlObject, "ul.drop-menu > li > a > span");
        } else if (mutation.target.className !== undefined && mutation.target.className === "grid-display-templates-table") {
            // item added to list view
            updateTranslations(htmlObject, "div.grid-content-cell-wrapper > span");
        } else if (mutation.target.className !== undefined && mutation.target.className === "controlWrapper") {
            // Check-box list
            updateTranslations(htmlObject, "div.choice-control-item-row > label > span");
        } else if (mutation.target.className !== undefined && mutation.previousSibling !== null ) {
            if (mutation.previousSibling.className === "stack-container"){
                // Radiobutton list
                updateTranslations(htmlObject, "div.multi-select-box-list-item > label > span");
            }
        } else if (mutation.target.className !== undefined && mutation.target.parentElement.parentElement.className === "input-control-wrapper") {
            // Dropdown start value
            updateTranslations(htmlObject, "div.dropdown-box a > span");
        } else if (mutation.target.className !== undefined && mutation.target.className === "popup-header-text") {
            // Subview header
            updateTranslations(htmlObject, "div.popup-header-text");
        } else if (mutation.target.className !== undefined && mutation.target.attributes.name !== undefined) {
            if (mutation.target.attributes.name.value.includes("Status")) {
                // Status Labels
                updateTranslations(htmlObject, "span[name*='Status']");
            }
        }
        }
    });

    obs.observe(htmlObject.body, {
        attributes: false,
        childList: true,
        subtree: true,
    });

}

function createPopupManagerMutationObserver(){
    var cont = popupManager.getContainer();
    if (typeof MutationObserver != 'undefined') {
    var observer = new MutationObserver(function (mutations) {
        $(mutations).each(function (i) {
            if (this.addedNodes.length > 0) {
                if(this.addedNodes[0].nodeName == "IFRAME"){
                        this.addedNodes[0].onload = () => {
                        if (this.addedNodes.length > 0) {
                            createMutationObservers(this.addedNodes[0].contentDocument);
                            updateTranslations(this.addedNodes[0].contentDocument);
                        }
                    }
                }         
            }
        });
    });

    var config = { characterData: true,
    attributes: false,
    childList: true,
    subtree: true 
    };
    observer.observe(cont[0], config);
    }
}
  
  function updateTranslations(htmlObject, selector = "") {
    const storedTranslations = window.localStorage.getItem("translations");
    if (!storedTranslations) {
      console.error("Trying to perform translation while no translations are stored!");
  
      return false
    }
    const translations = JSON.parse(storedTranslations);
    let elements;
    if (selector === "") {
      // if we don't know what elements to translate, then we just try to translate everything.
      elements = htmlObject.querySelectorAll(
        "span, a, .grid-column-header-text, div.popup-header-text, .panel-header-text, div.message, .popup-footer-c > a, ul.drop-menu > li > a > span, div.grid-content-cell-wrapper > span, .choice-control-item-row> label > span"
      );
    } else {
      elements = htmlObject.querySelectorAll(selector);
    }
    let label;
    elements.forEach(function (item) {
      label = item.innerHTML;
      label = label.replace(/\s+/g, " ").trim();
      const keys = translations.filter((x) => x.key === label);
      if (keys.length > 0) {
        const label = keys[0];
        item.innerHTML = label.translation;
      }
    });
  }
  
  function getLocaleFromFormURL() {
    const localeMapping = {
      "IN": "en-in",
      "AR": "es-ar",
      "CO": "es-co",
      "CL": "es-cl",
      "MX": "es-mx"
    };
    const url = window.location.href;
  
    if (!url) {
      return
    }
    const regex = /Form\/(.*)\.Form\./;
    const match = url.match(regex);
  
    if (!match) {
      return
    }
    
    const countryCode = match[1];
    return localeMapping[countryCode] || undefined
  }
  
  function getLocale() {
    const localeFromFormURL = getLocaleFromFormURL();
    
    if (localeFromFormURL) {
      return localeFromFormURL
    }
  
    const browserLocale = (navigator.language || navigator.userLanguage).toLowerCase();
    if (browserLocale === "es-ar" || browserLocale === "es-419") {
      return "es-ar";
    }
    
    return browserLocale;
  }
  
  function doTranslations(htmlObject) {
    const translationsLastSetAt = window.localStorage.getItem("translationsSetAt");
    const refreshInterval = 1 * 24 * 1000 * 36000; // 24 hrs
    let translationsNeedRefresh = true;
    if (translationsLastSetAt && translationsLastSetAt > new Date(Date.now() - refreshInterval)) {
      translationsNeedRefresh = false;
    }
    //TODO: we should actually make this cache dependend on the browser language
    const translations = window.localStorage.getItem("translations");
      if (translations && JSON.parse(translations) instanceof Array && translationsNeedRefresh === false) {
        console.log("-------------- using translations from localStorage");
        updateTranslations(htmlObject);
      } else {
        console.log("-------------- retrieving translations from API");
        const locale = getLocale();
        const request = new window.XMLHttpRequest();
        const url = `https://fcg-rest.herokuapp.com/phraseApp/getTranslations/${locale}`;
        request.open("GET", encodeURI(url), false);
        request.onreadystatechange = () => {
          if (request.readyState === window.XMLHttpRequest.DONE) {
            if (request.status === 0 || (request.status >= 200 && request.status < 400)) {
              const oDataObj = JSON.parse(request.response);
              const translations = JSON.stringify(oDataObj);
              if (!translations) {
                console.error("no translations fetched");
                return;
              }
              window.localStorage.setItem("translations", translations);
              window.localStorage.setItem("translationsSetAt", new Date().toISOString());
  
              updateTranslations(htmlObject);
              } else {
                console.error("error in getting translations", request.responseText);
              }
          }
        };
        request.send();
      }
  }
  
  window.$(document).ready(function () {
    createMutationObservers(document);
    createPopupManagerMutationObserver();
    doTranslations(document);
  });
  
