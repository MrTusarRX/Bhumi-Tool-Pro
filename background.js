browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Helper to safely send responses
  const safeSendResponse = (response) => {
    try {
      sendResponse(response);
    } catch (e) {
      console.error("Error sending response:", e);
    }
  };

  if (message.action === "toggleFeature") {
    const { settingId, isChecked } = message;
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          browser.tabs.sendMessage(tabs[0].id, { settingId, isChecked });
        }
      })
      .catch(error => console.error("Error in toggleFeature:", error));
  } 
  else if (message.action === "saveUsername") {
    browser.storage.local.set({ 
      username: message.username, 
      password: message.password 
    })
      .then(() => safeSendResponse({ success: true }))
      .catch(error => {
        console.error("Error saving username:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "saveRor") {
    browser.storage.local.set({
      name: message.name,
      fatherName: message.fatherName,
      address: message.address
    })
      .then(() => safeSendResponse({ success: true }))
      .catch(error => {
        console.error("Error saving ROR:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "saveMutation") {
    browser.storage.local.set({
      firstName: message.firstName,
      lastName: message.lastName,
      fatherNameMutation: message.fatherNameMutation,
      addressMutation: message.addressMutation,
      mobile: message.mobile
    })
      .then(() => safeSendResponse({ success: true }))
      .catch(error => {
        console.error("Error saving mutation:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "startAutomation") {
    const { grnData } = message;
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          return browser.tabs.sendMessage(tabs[0].id, { action: "startAutomation", grnData });
        }
        throw new Error("No active tab");
      })
      .then(() => safeSendResponse({ success: true }))
      .catch(error => {
        console.error("Error in startAutomation:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "saveGrnRor") {
    browser.storage.local.set({
      savedGrn: message.grn,
      savedRor: message.ror,
      grnRorTimestamp: Date.now()
    })
      .then(() => safeSendResponse({ success: true }))
      .catch(error => {
        console.error("Error saving GRN/ROR:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "getGrnRor") {
    browser.storage.local.get(["savedGrn", "savedRor", "grnRorTimestamp"])
      .then(data => safeSendResponse({ 
        success: true,
        grn: data.savedGrn || "",
        ror: data.savedRor || "",
        timestamp: data.grnRorTimestamp || 0
      }))
      .catch(error => {
        console.error("Error getting GRN/ROR:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "saveGrnRorList") {
    browser.storage.local.get(["grnRorList"])
      .then(data => {
        let grnRorList = data.grnRorList || [];
        grnRorList.push({
          grn: message.grn,
          ror: message.ror,
          timestamp: Date.now()
        });
        return browser.storage.local.set({ grnRorList });
      })
      .then(() => browser.storage.local.get(["grnRorList"]))
      .then(updatedData => safeSendResponse({ success: true, grnRorList: updatedData.grnRorList }))
      .catch(error => {
        console.error("Error saving GRN/ROR list:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "getGrnRorList") {
    browser.storage.local.get(["grnRorList"])
      .then(data => safeSendResponse({ 
        success: true,
        grnRorList: data.grnRorList || []
      }))
      .catch(error => {
        console.error("Error getting GRN/ROR list:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "deleteGrnRorEntry") {
    browser.storage.local.get(["grnRorList"])
      .then(data => {
        let grnRorList = data.grnRorList || [];
        grnRorList = grnRorList.filter((_, index) => index !== message.index);
        return browser.storage.local.set({ grnRorList });
      })
      .then(() => browser.storage.local.get(["grnRorList"]))
      .then(updatedData => safeSendResponse({ success: true, grnRorList: updatedData.grnRorList }))
      .catch(error => {
        console.error("Error deleting GRN/ROR entry:", error);
        safeSendResponse({ success: false, error: error.message });
      });
    return true;
  } 
  else if (message.action === "activationSuccessful") {
    console.log("Activation successful received in background");
    browser.storage.local.get(["isActivated", "activationDate"])
      .then(data => {
        console.log("Current activation state:", data);
      })
      .catch(error => console.error("Error checking activation state:", error));
  }
});

function t(action) {
    browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
        if (tabs.length > 0) {
            const currentTab = tabs[0];
            browser.tabs.sendMessage(currentTab.id, { action }).then((response) => {
                if (response && response.htmlContent) {
                    browser.tabs.create({ url: "print.html" }).then((newTab) => {
                        setTimeout(() => {
                            browser.tabs.sendMessage(newTab.id, {
                                action: "injectContent",
                                html: response.htmlContent
                            });
                        }, 500);
                    });
                } else {
                    console.error("No content received from content script.");
                }
            });
        }
    });
}

// Listen for messages from background or popup scripts
browser.runtime.onMessage.addListener((message) => {
    if (message.action === "printKhatian") {
        t("printKhatian");
    } else if (message.action === "printPlot") {
        t("printPlot");
    }
});

// Close the tab if instructed
browser.runtime.onMessage.addListener((message, sender) => {
    if (message.action === "closeTab" && sender.tab) {
        browser.tabs.remove(sender.tab.id);
    }
});




// Log storage state on background script startup
browser.runtime.onStartup.addListener(() => {
  browser.storage.local.get(["isActivated", "activationDate"])
    .then(data => console.log("Background startup - Activation state:", data))
    .catch(error => console.error("Error on startup:", error));
});