document.addEventListener("DOMContentLoaded", async () => {
  function showCustomAlert(message) {
    const oldAlert = document.getElementById('my-custom-alert');
    if (oldAlert) oldAlert.remove();

    const alertOverlay = document.createElement('div');
    alertOverlay.id = 'my-custom-alert';
    alertOverlay.className = 'custom-alert';

    const alertBox = document.createElement('div');
    alertBox.className = 'custom-alert-box';
    alertBox.innerHTML = `
      <strong>Alert</strong>
      <p>${message}</p>
    `;

    const okButton = document.createElement('button');
    okButton.textContent = 'OK';
    okButton.addEventListener('click', () => alertOverlay.remove());

    alertBox.appendChild(okButton);
    alertOverlay.appendChild(alertBox);
    document.body.appendChild(alertOverlay);
  }

  try {
    enableExtensionFeatures();
  } catch (error) {
  
    showCustomAlert("⚠️ Error initializing extension");
  }

  function enableExtensionFeatures() {
    document.querySelectorAll('input, button, form, .tab-button').forEach(el => {
      el.disabled = false;
      el.classList.remove('disabled');
    });
    initializeFeatures();
  }

  async function initializeFeatures() {
    try {
      const tabButtons = document.querySelectorAll('.tab-button');
      const tabs = document.querySelectorAll('.tab');
      
      tabButtons.forEach(button => {
        button.addEventListener('click', () => {
          tabButtons.forEach(btn => btn.classList.remove('active'));
          tabs.forEach(tab => tab.classList.remove('active'));
          button.classList.add('active');
          document.getElementById(button.dataset.tab)?.classList.add('active');
        });
      });

    
      const settings = [
        'autoLogin', 'autoCaptcha', 'khatianPrint', 'plotPrint', 'rorAutoFill',
        'mutationAutoFill', 'grnAutoClick', 'chatbot', 'disclaimer'
      ];

      settings.forEach(settingId => {
        const checkbox = document.getElementById(settingId);
        if (checkbox) {
          browser.storage.local.get(settingId)
            .then(result => checkbox.checked = result[settingId] || false)
            .catch(error => console.error(`Error loading ${settingId}:`, error));

          checkbox.addEventListener('change', async () => {
            try {
              const isChecked = checkbox.checked;
              await browser.storage.local.set({ [settingId]: isChecked });
              await browser.runtime.sendMessage({ 
                action: "toggleFeature", 
                settingId, 
                isChecked 
              });
            } catch (error) {
            
            }
          });
        }
      });

  
      setupCredentialsSection('save-username', 'txtusername', 'txtpassword', 'saveUsername', ['username', 'password']);


      setupCredentialsSection('save-ror', 'txtName', 'txtFatherName', 'saveRor', ['name', 'fatherName', 'address'], 'txtaddress');

  
      setupCredentialsSection('save-mutation', 'txtFirstname', 'txtLastName', 'saveMutation', 
        ['firstName', 'lastName', 'fatherNameMutation', 'addressMutation', 'mobile'], 
        'txtFatherNameMutation', 'txtaddressMutation', 'txtMobile');

      const grnTableBody = document.querySelector('#grn-table tbody');
      await setupGrnManagement(grnTableBody);

    } catch (error) {
     
      showCustomAlert("⚠️ Error loading extension features");
    }
  }

  
  function setupCredentialsSection(saveButtonId, input1Id, input2Id, action, storageKeys, ...extraInputIds) {
    const saveButton = document.getElementById(saveButtonId);
    if (saveButton) {
      saveButton.addEventListener('click', async () => {
        const values = {
          [storageKeys[0]]: document.getElementById(input1Id).value.trim(),
          [storageKeys[1]]: document.getElementById(input2Id).value.trim()
        };
        extraInputIds.forEach((id, index) => {
          values[storageKeys[index + 2]] = document.getElementById(id)?.value.trim() || '';
        });

   
        if (!values[storageKeys[0]] || !values[storageKeys[1]]) {
          showCustomAlert(`Please fill in required fields for ${action}`);
          return;
        }
        
        try {
          await browser.storage.local.set(values);
          const response = await browser.runtime.sendMessage({ action, ...values });
          showCustomAlert(response.success ? 
            `${action} details saved successfully` : 
            `Failed to save ${action} details: ${response.error || 'Unknown error'}`);
        } catch (error) {
         
          showCustomAlert(`Error saving ${action} details`);
        }
      });

      browser.storage.local.get(storageKeys)
        .then(result => {
          document.getElementById(input1Id).value = result[storageKeys[0]] || '';
          document.getElementById(input2Id).value = result[storageKeys[1]] || '';
          extraInputIds.forEach((id, index) => {
            const element = document.getElementById(id);
            if (element) element.value = result[storageKeys[index + 2]] || '';
          });
        })
        .catch(error => console.error(`Error loading ${action} details:`, error));
    }
  }

  document.getElementById("save-mutation").addEventListener("click", () => {
  const targetValues = {
    lstShareAreaUnit: document.getElementById("areaUnit").value,
    lstMutePurposeCode: document.getElementById("purposeCode").value,
    lstLandCode: document.getElementById("landCode").value
  };

 
  browser.storage.local.set({ targetValues }, () => {
  

 
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      browser.tabs.sendMessage(tabs[0].id, { action: "applyValues", targetValues });
    });
  });
});


browser.storage.local.get("targetValues", (data) => {
  if (data.targetValues) {
    document.getElementById("areaUnit").value = data.targetValues.lstShareAreaUnit || "";
    document.getElementById("purposeCode").value = data.targetValues.lstMutePurposeCode || "";
    document.getElementById("landCode").value = data.targetValues.lstLandCode || "";
  }
});




  async function setupGrnManagement(grnTableBody) {
    function updateGrnTable(grnData) {
      grnTableBody.innerHTML = grnData.length === 0 ? 
        '<tr><td colspan="4">No data available</td></tr>' : 
        grnData.map((item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.grn}</td>
            <td>${item.ror}</td>
            <td><button class="remove-grn" data-index="${index}">Remove</button></td>
          </tr>
        `).join('');

      document.querySelectorAll('.remove-grn').forEach(button => {
        button.addEventListener('click', async () => {
          const index = parseInt(button.dataset.index);
          try {
            const response = await browser.runtime.sendMessage({ action: "deleteGrnRorEntry", index });
            if (response.success) {
              updateGrnTable(response.grnRorList);
              showCustomAlert("GRN entry removed successfully");
            } else {
              showCustomAlert("Failed to remove GRN entry");
             
            }
          } catch (error) {
           
            showCustomAlert("Error removing GRN entry");
          }
        });
      });
    }

    
    const loadGrnRorList = async () => {
      try {
        const response = await browser.runtime.sendMessage({ action: "getGrnRorList" });
        if (response.success) 
          updateGrnTable(response.grnRorList);
      } catch (error) {
       
      }
    };

   
    document.getElementById('grn-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const grn = document.getElementById('grn-input')?.value.trim();
      const ror = document.getElementById('ror-input')?.value.trim();
      
      if (!grn || !ror) {
        showCustomAlert('Please enter both GRN and ROR values');
        return;
      }

      try {
        const response = await browser.runtime.sendMessage({
          action: "saveGrnRorList",
          grn,
          ror
        });
        if (response.success) {
          document.getElementById('grn-input').value = '';
          document.getElementById('ror-input').value = '';
          updateGrnTable(response.grnRorList);
          showCustomAlert("GRN/ROR entry saved successfully");
        } else {
          showCustomAlert("Failed to save GRN/ROR entry");
        
        }
      } catch (error) {
       
        showCustomAlert("Error saving GRN/ROR entry");
      }
    });

 
    document.getElementById('start-automation')?.addEventListener('click', async () => {
      try {
        const response = await browser.runtime.sendMessage({ action: "getGrnRorList" });
        if (response.success && response.grnRorList.length > 0) {
          const automationResponse = await browser.runtime.sendMessage({ 
            action: "startAutomation", 
            grnData: response.grnRorList 
          });
          showCustomAlert(automationResponse.success ? 
            "Automation started successfully" : 
            `Failed to start automation: ${automationResponse.error || 'Unknown error'}`);
        } else {
          showCustomAlert('Please add GRN details first.');
        }
      } catch (error) {
       
        showCustomAlert("Error starting automation");
      }
    });

    await loadGrnRorList();
  }
});