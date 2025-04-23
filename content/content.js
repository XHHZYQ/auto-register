// 字段映射配置
const FIELD_MAPPING = {
  '姓名中文': 'input[placeholder="请输入中文姓名"]',
  '性别': '.am-input-group:has(span:contains("性别")) .el-select',
  '民族': 'input[placeholder="请输入民族"]',
  '学校全称': 'input[placeholder="请输入学校名称"]',
  '年级': '.am-input-group:has(span:contains("年级")) .el-select',
  '证件号码': '.am-input-group:has(span:contains("证件号码")) .el-select',
  '身份证号': 'input[placeholder="请输入身份证号"]',
  '监护人邮箱': 'input[placeholder="请输入邮箱"]',
  '监护人手机': 'input[placeholder="请输入手机号"]',
  '一寸照片': 'input[type="file"]'
};

// 固定选项配置
const FIXED_OPTIONS = {
  '赛项名称': 'B4: 信息科技算法',
  '队员组别': '中学组',
  '省份': '重庆',
  '城市': '重庆_市'
};


// 存储上传的数据
let uploadedData = {
  students: [],
  photos: {}
};

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    // 响应ping请求
    sendResponse({ pong: true });
    return true;
  } else if (request.action === 'fillForm') {
    // 保存上传的数据
    uploadedData.students = request.data;
    uploadedData.photos = request.photoData;

    handleFormFill(request.data, request.photoData)
      .then(result => sendResponse({ success: result }))
      .catch(error => {
        console.error('Form fill error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (request.action === 'getStoredData') {
    // 返回已存储的数据
    sendResponse({
      students: uploadedData.students,
      photos: uploadedData.photos
    });
    return true;
  }
});

// 处理整个报名流程
async function handleFormFill(studentData, photoData) {
  try {
    // 如果未初始化，先进行初始化流程
    // await initializeRegistration();

    // 3. 随机选择指导教师
    // await selectRandomTeacher();

    // 4. 填写参赛信息
    await fillCompetitionInfo(studentData);

    // 5. 添加队员信息
    await addTeamMember(studentData, photoData);

    // 等待用户确认继续
    await new Promise((resolve) => {
      const messageHandler = (request) => {
        if (request.action === 'continueProcess') {
          chrome.runtime.onMessage.removeListener(messageHandler);
          resolve();
        }
      };
      chrome.runtime.onMessage.addListener(messageHandler);
    });

    // 6. 点击预览确认按钮
    // await handlePreviewConfirm();

    // 7. 点击提交报名按钮
    // await handleSubmitRegistration();

    // 8. 处理成功弹窗
    // await handleSuccessDialog();

    return true;
  } catch (error) {
    console.error('Registration process error:', error);
    return false;
  }
}

// 初始化报名流程
async function initializeRegistration() {
  return new Promise(async (resolve, reject) => {
    try {
      // 等待弹窗出现
      const checkDialog = setTimeout(() => {
        const checkbox = document.querySelector('.el-checkbox__input input[type="checkbox"]');
        const confirmButton = document.querySelector('.memOk.am-btn-primary');
        const dialog = document.querySelector('.el-dialog__wrapper');
        if (checkbox && confirmButton && dialog) {
          clearTimeout(checkDialog);

          // 勾选复选框
          checkbox.click();

          // 点击确认按钮
          confirmButton.click();

          setTimeout(() => {
            // 手动关闭弹窗
            dialog.style.display = 'none';
            // 移除弹窗的遮罩层
            const mask = document.querySelector('.v-modal');
            if (mask) {
              mask.parentNode.removeChild(mask);
            }
          }, 500);

          setTimeout(() => {
            resolve();
          }, 500);
        }
      }, 50);

      // 设置超时
      setTimeout(() => {
        clearTimeout(checkDialog);
        reject(new Error('License dialog timeout'));
      }, 5000);

    } catch (error) {
      reject(error);
    }
  });
}

// 辅助函数：等待元素出现
async function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(selector)) {
      setTimeout(() => {
        resolve(document.querySelector(selector));
      }, 100);
    }

    const observer = new MutationObserver((mutations) => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        setTimeout(() => {
          resolve(element);
        }, 100);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Element ${selector} not found within ${timeout}ms`));
    }, timeout);
  });
}

// 辅助函数：等待下拉选项加载完成
async function waitForDropdownOptions(selector, value = '', timeout = 10000) {
  return new Promise((resolve, reject) => {
    const observer = new MutationObserver((mutations) => {
      let options;

      if (value === '重庆_市') {
        // 对于重庆选项，找到只包含一个选项的下拉列表
        const allDropdowns = document.querySelectorAll('.el-select-dropdown');
        options = Array.from(allDropdowns)
          .filter(dropdown => dropdown.querySelectorAll('.el-select-dropdown__item').length === 1)
          .map(dropdown => dropdown.querySelector('.el-select-dropdown__item'))
          .filter(Boolean);
      } else {
        // 其他情况使用原来的逻辑
        options = document.querySelectorAll(selector);
      }

      if (options && options.length > 0) {
        observer.disconnect();
        resolve(Array.from(options));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    setTimeout(() => {
      observer.disconnect();
      reject(new Error(`Dropdown options not found within ${timeout}ms`));
    }, timeout);
  });
}

// 修改随机选择指导教师函数
async function selectRandomTeacher() {
  try {
    // 等待指导教师按钮出现
    const teacherButtons = await waitForElement('.teacherICon .el-button');
    if (!teacherButtons) {
      throw new Error('No teacher buttons found');
    }

    const buttons = document.querySelectorAll('.teacherICon .el-button');
    const randomIndex = Math.floor(Math.random() * buttons.length);
    buttons[randomIndex].click();
    // 触发点击事件
    buttons[randomIndex].dispatchEvent(new Event('click', { bubbles: true }));
    setTimeout(() => {
      return Promise.resolve();
    }, 500);
  } catch (error) {
    return Promise.reject(error);
  }
}

// 修改填写参赛信息函数
async function fillCompetitionInfo(studentData) {
  try {
    // 先找到"参赛信息"标题元素
    const titleElement = Array.from(document.querySelectorAll('.titleB'))
      .find(el => el.textContent.trim() === '参赛信息：');

    if (!titleElement) {
      console.error('参赛信息标题未找到');
      throw new Error('Competition info title not found');
    }

    // 找到表单容器
    const formContainer = titleElement.nextElementSibling;
    if (!formContainer || !formContainer.classList.contains('nn95c')) {
      console.error('参赛信息表单未找到');
      throw new Error('Competition info form not found');
    }

    // 选择赛项名称
    const competitionSelect = formContainer.querySelector('.el-select');
    if (competitionSelect) {
      await handleSelect(competitionSelect, FIXED_OPTIONS['赛项名称']);
    }

    // 等待并选择队员组别
    await new Promise(resolve => setTimeout(resolve, 1000)); // 等待接口返回
    const groupSelect = formContainer.querySelectorAll('.el-select')[1];
    if (groupSelect) {
      await handleSelect(groupSelect, FIXED_OPTIONS['队员组别']);
    }

    // 选择省份和城市
    const locationSelects = formContainer.querySelectorAll('.el-select');
    if (locationSelects.length >= 4) {
      await handleSelect(locationSelects[2], FIXED_OPTIONS['省份']);
      // 等待城市列表加载
      await new Promise(resolve => setTimeout(resolve, 1000));
      await handleSelect(locationSelects[3], FIXED_OPTIONS['城市']);
    }

    // 填写团队名称
    const teamNameInput = formContainer.querySelector('input[placeholder="请输入您的队名，团队名称限制在5个汉字以内"]');
    if (teamNameInput) {
      teamNameInput.value = `${studentData['姓名中文']}团队`;
      teamNameInput.dispatchEvent(new Event('change', { bubbles: true }));
      teamNameInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  } catch (error) {
    console.error('填写参赛信息失败:', error);
    throw error;
  }
}

// 添加队员信息
async function addTeamMember(studentData, photoData) {
  return new Promise((resolve, reject) => {
    // 点击添加队员按钮
    const addButton = document.querySelector('button.submitC');
    if (!addButton) {
      reject(new Error('Add member button not found'));
      return;
    }

    addButton.click();

    // 等待弹窗出现并填写信息
    const checkDialog = setTimeout(async () => {
      const form = document.querySelector('.memBody.am-modal-bd form');
      if (form) {
        clearTimeout(checkDialog);

        try {
          await fillMemberForm(studentData, photoData);
          // 在成功添加队员后发送消息给 popup
          chrome.runtime.sendMessage({
            action: 'memberAdded',
            currentStudent: studentData
          });
          setTimeout(() => {
            resolve();
          }, 100);
        } catch (error) {
          reject(error);
        }
      }
    }, 500);
  });
}

// 辅助函数：通过label文本查找对应的select元素
function findSelectByLabel(container, labelText) {
  const groups = container.querySelectorAll('.am-input-group');
  for (const group of groups) {
    const label = group.querySelector('.am-input-group-label');
    if (label && label.textContent.includes(labelText)) {
      return group.querySelector('.el-select');
    }
  }
  return null;
}

// 填写队员表单
async function fillMemberForm(studentData, photoData) {
  // 获取弹窗表单容器
  const formContainer = document.querySelector('.memBody.am-modal-bd');
  if (!formContainer) {
    throw new Error('Member form container not found');
  }

  for (const [field, value] of Object.entries(studentData)) {
    if (!FIELD_MAPPING[field]) continue;

    let element;
    if (field === '性别' || field === '年级' || field === '证件号码') {
      element = findSelectByLabel(formContainer, field);
    } else {
      const selector = FIELD_MAPPING[field];
      element = formContainer.querySelector(selector);
    }

    if (!element) {
      console.warn(`Element not found for field: ${field}`);
      continue;
    }

    if (element.classList.contains('el-select')) {
      await handleSelect(element, value);
    } else if (element.type === 'file' && field === '一寸照片') {
      await handlePhotoUpload(element, photoData);
    } else {
      element.value = field in FIXED_OPTIONS ? FIXED_OPTIONS[field] : value;
      // if (field !== '姓名中文') {
        // console.log('input change', field, element);
      element.dispatchEvent(new Event('input', { bubbles: true }));
      // }
      element.dispatchEvent(new Event('change', { bubbles: true }));
      // element.dispatchEvent(new Event('blur', { bubbles: true }));
    }
  }

  // 点击提交按钮
  const submitButton = document.querySelector('.memFooter button.memOk.am-btn.am-btn-primary');
  if (submitButton) {
    setTimeout(() => {
      submitButton.click();
      submitButton.dispatchEvent(new Event('click', { bubbles: true }));
    }, 500);
  }
}

// 修改处理下拉框选择函数
async function handleSelect(element, value) {
  return new Promise(async (resolve, reject) => {
    try {
      // 点击下拉框以显示选项
      const input = element.querySelector('.el-input__inner');
      if (!input) {
        reject(new Error('Select input not found'));
        return;
      }

      input.click();

      // 等待下拉选项出现，传递 value 参数
      const options = await waitForDropdownOptions('.el-select-dropdown__item', value);
      const targetOption = options.find(opt => {
        // 如果 value 包含 _，则需要使用_ 进行分割，进行匹配
        const targetValue = value.includes('_') ? value.split('_')[0] : value;
        return opt.textContent.trim() === targetValue.trim();
      });
      if (targetOption) {
        targetOption.click();
        resolve();
      } else {
        reject(new Error(`Option not found: ${value}`));
      }
    } catch (error) {
      reject(error);
    }
  });
}

// 处理照片上传
async function handlePhotoUpload(element, photoData) {
  try {
    const response = await fetch(photoData);
    const blob = await response.blob();
    const file = new File([blob], 'filename.jpg', { type: 'image/jpg' });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    element.files = dataTransfer.files;
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.dispatchEvent(new Event('blur', { bubbles: true }));
  } catch (error) {
    console.error('Photo upload error:', error);
    throw error;
  }
}

// 选择下拉框选项
async function selectDropdownOption(field, value) {
  return new Promise((resolve, reject) => {
    const select = document.querySelector(`.el-select[data-field="${field}"]`);
    if (!select) {
      reject(new Error(`Select not found for field: ${field}`));
      return;
    }

    handleSelect(select, value)
      .then(resolve)
      .catch(reject);
  });
}

// 等待队员列表渲染完成
async function waitForTeamListReady() {
  return new Promise((resolve, reject) => {
    const checkTeamList = setInterval(() => {
      // 找到"队员列表"标题元素
      const titleElement = Array.from(document.querySelectorAll('.titleB'))
        .find(el => el.textContent.includes('队员列表'));

      if (titleElement) {
        // 获取下一个兄弟元素
        const formItemElement = titleElement.nextElementSibling;

        if (formItemElement &&
          formItemElement.classList.contains('form-item') &&
          formItemElement.querySelector('.am-form')) {
          clearInterval(checkTeamList);
          resolve();
        }
      }
    }, 500);

    // 设置超时
    setTimeout(() => {
      clearInterval(checkTeamList);
      reject(new Error('等待队员列表渲染超时'));
    }, 10000);
  });
}

// 处理预览确认按钮点击
async function handlePreviewConfirm() {
  return new Promise(async (resolve, reject) => {
    try {
      // 等待队员列表渲染完成
      await waitForTeamListReady();

      // 查找预览确认按钮
      const previewButton = await waitForElement('button.submitB.am-btn.am-btn-secondary.am-active');
      if (!previewButton || previewButton.textContent.trim() !== '预览确认') {
        throw new Error('Preview button not found');
      }

      setTimeout(() => {
        previewButton.click();
      }, 500);

      // 等待预览内容加载完成
      await waitForElement('.infoCon');

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 处理提交报名按钮点击
async function handleSubmitRegistration() {
  return new Promise(async (resolve, reject) => {
    try {
      // 查找提交报名按钮
      const submitButton = await waitForElement('button.memOk.am-btn.am-btn-primary.am-btn.am-btn-secondary');
      if (!submitButton || submitButton.textContent.trim() !== '提交报名') {
        throw new Error('Submit registration button not found');
      }

      submitButton.click();

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

// 处理成功弹窗
async function handleSuccessDialog() {
  return new Promise(async (resolve, reject) => {
    try {
      // 等待成功弹窗出现
      const titleElement = await waitForElement('.el-message-box__title span');
      if (!titleElement || titleElement.textContent.trim() !== '报名成功') {
        throw new Error('Success dialog title not found');
      }

      // 查找确定按钮
      const confirmButton = document.querySelector('.el-message-box__btns button');
      if (!confirmButton || confirmButton.textContent.trim() !== '确定') {
        throw new Error('Success dialog confirm button not found');
      }

      confirmButton.click();

      const dimmer = document.querySelector('.am-dimmer.am-active');
      if (dimmer) {
        dimmer.style.display = 'none';
      }
      setTimeout(() => {
      const backButton = document.querySelector('.centerBtns .el-button.backBtn.el-button--default.el-button--small');
        if (backButton) {
          backButton.click();
        }
      }, 300);
      // 处理遮罩层
      setTimeout(() => {
        resolve();
      }, 100);

    } catch (error) {
      reject(error);
    }
  });
} 