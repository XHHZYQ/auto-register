let studentData = [];
let photoFiles = {};
let isPaused = false;
let currentIndex = 0;
let processCount = 0;
let waitingForConfirmation = false;

// 添加重试相关的配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

document.getElementById('folderInput').addEventListener('change', handleFolderSelect);
document.getElementById('startBtn').addEventListener('click', startProcess);
document.getElementById('pauseBtn').addEventListener('click', togglePause);

// 监听来自 content.js 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'memberAdded') {
    // 设置等待确认状态
    waitingForConfirmation = true;
    // 更新按钮状态
    document.getElementById('pauseBtn').style.display = 'none';
    document.getElementById('startBtn').style.display = 'block';
    document.getElementById('startBtn').textContent = '继续处理下一个';
    // 显示当前处理的学生信息
    document.getElementById('currentStudent').textContent = `${request.currentStudent['姓名中文']} (已添加，等待确认)`;
  }
  sendResponse({ received: true });
  return true;
});

async function handleFolderSelect(event) {
  const files = event.target.files;
  let excelFile = null;
  photoFiles = {};
  
  // 遍历所有文件
  for (let file of files) {
    const fileName = file.name.toLowerCase();
    
    // 查找Excel文件
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      excelFile = file;
    }
    // 查找图片文件
    else if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function(e) {
        photoFiles[file.name] = e.target.result;
        checkStartCondition();
      };
      reader.readAsDataURL(file);
    }
  }
  console.log('photoFiles', photoFiles);
  
  
  // 处理Excel文件
  if (excelFile) {
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        studentData = XLSX.utils.sheet_to_json(firstSheet);
        console.log('学生数据:', studentData);
        
        if (studentData.length > 0) {
          // 验证Excel文件是否包含必要的列
          if (!studentData[0].hasOwnProperty('一寸照片')) {
            alert('Excel文件缺少"一寸照片"列，请检查文件格式！');
            studentData = [];
          }
          checkStartCondition();
        }
      } catch (error) {
        alert('Excel文件解析失败，请检查文件格式！');
        console.error('Excel解析错误:', error);
      }
    };
    reader.readAsArrayBuffer(excelFile);
  } else {
    alert('未找到Excel文件，请确保文件夹中包含.xlsx或.xls文件！');
  }
}

function checkStartCondition() {
  const hasStudentData = studentData.length > 0;
  const hasPhotoFiles = Object.keys(photoFiles).length > 0;
  
  // 验证每个学生的照片是否都存在
  // const allPhotosExist = studentData.every(student => {
  //   console.log('photoFiles', photoFiles);
  //   return student['一寸照片'] && photoFiles.hasOwnProperty(student['一寸照片']);
  // });
  
  // if (hasStudentData && hasPhotoFiles && !allPhotosExist) {
  //   alert('部分学生的照片文件缺失，请检查照片文件是否完整！');
  // }
  
  // document.getElementById('startBtn').disabled = !(hasStudentData && hasPhotoFiles && allPhotosExist);
  // document.getElementById('startBtn').disabled = !(hasStudentData && hasPhotoFiles);
}

function startProcess() {
  if (currentIndex >= studentData.length) {
    currentIndex = 0;
    processCount = 0;
  }

  if (waitingForConfirmation) {
    // 如果是在等待确认状态，发送继续处理的消息
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'continueProcess' });
      }
    });
    waitingForConfirmation = false;
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'block';
    document.getElementById('pauseBtn').textContent = '暂停';
    return;
  }

  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('pauseBtn').style.display = 'block';
  document.querySelector('.progress-section').style.display = 'block';
  
  isPaused = false;
  processNext();
}

function togglePause() {
  isPaused = !isPaused;
  document.getElementById('pauseBtn').textContent = isPaused ? '继续' : '暂停';
  
  if (!isPaused) {
    processNext();
  }
}

// 检查content script是否已准备好
async function checkContentScriptReady(tabId) {
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tabId, { action: 'ping' }, function(response) {
      resolve(!chrome.runtime.lastError && response && response.pong);
    });
  });
}

// 带重试机制的消息发送函数
async function sendMessageWithRetry(tabId, message, retries = MAX_RETRIES) {
  return new Promise(async (resolve, reject) => {
    const attemptSend = async (attemptsLeft) => {
      try {
        // 首先检查content script是否准备好
        const isReady = await checkContentScriptReady(tabId);
        if (!isReady) {
          throw new Error('Content script not ready');
        }

        // 发送实际消息
        chrome.tabs.sendMessage(tabId, message, function(response) {
          if (chrome.runtime.lastError) {
            throw chrome.runtime.lastError;
          }
          resolve(response);
        });
      } catch (error) {
        console.log(`发送消息失败，剩余重试次数: ${attemptsLeft-1}`);
        if (attemptsLeft > 1) {
          setTimeout(() => attemptSend(attemptsLeft - 1), RETRY_DELAY);
        } else {
          reject(error);
        }
      }
    };

    attemptSend(retries);
  });
}

function processNext() {
  if (isPaused || currentIndex >= studentData.length) {
    if (currentIndex >= studentData.length) {
      alert('所有数据处理完成！');
      document.getElementById('pauseBtn').style.display = 'none';
      document.getElementById('startBtn').style.display = 'block';
      document.getElementById('startBtn').textContent = '重新开始';
    }
    return;
  }

  const student = studentData[currentIndex];
  document.getElementById('currentStudent').textContent = student['姓名中文'];
  
  if (processCount >= 1) {
    isPaused = true;
    processCount = 0;
    document.getElementById('pauseBtn').textContent = '继续';
    alert('已处理1名学生，请检查报名信息是否正确后继续。');
    return;
  }

  console.log('当前学生', student);
  console.log('photoFiles', photoFiles[student['一寸照片']]);

  chrome.tabs.query({active: true, currentWindow: true}, async function(tabs) {
    if (!tabs[0]) {
      alert('请在目标网页上使用此扩展！');
      updateFailCount();
      return;
    }

    try {
      const response = await sendMessageWithRetry(tabs[0].id, {
        action: 'fillForm',
        data: student,
        photoData: photoFiles[student['一寸照片']]
      });

      if (response && response.success) {
        updateSuccessCount();
      } else {
        updateFailCount();
      }
      
      currentIndex++;
      processCount++;
      updateProgress(currentIndex, studentData.length);
      
      setTimeout(processNext, 2000);
    } catch (error) {
      console.error('处理失败:', error);
      alert('处理失败，请刷新页面后重试！如果问题持续存在，请确保您在正确的网页上使用此扩展。');
      updateFailCount();
    }
  });
}

function updateProgress(current, total) {
  const percentage = (current / total) * 100;
  document.getElementById('progressBar').style.width = percentage + '%';
  document.getElementById('progressText').textContent = `${current}/${total}`;
}

function updateSuccessCount() {
  const element = document.getElementById('successCount');
  element.textContent = parseInt(element.textContent) + 1;
}

function updateFailCount() {
  const element = document.getElementById('failCount');
  element.textContent = parseInt(element.textContent) + 1;
}

// 当 popup 页面加载时获取存储的数据
document.addEventListener('DOMContentLoaded', () => {
  // 获取当前标签页
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // 向 content script 发送消息获取存储的数据
    // chrome.tabs.sendMessage(currentTab.id, { action: 'getStoredData' }, (response) => {
    //   if (chrome.runtime.lastError) {
    //     console.error('Error:', chrome.runtime.lastError);
    //     return;
    //   }

    //   displayStoredData(response);
    // });
  });
});

// 显示存储的数据
function displayStoredData(data) {
  if (!data || !data.students || data.students.length === 0) {
    return;
  }

  // 如果有学生数据，显示第一个学生的照片文件名
  if (data.students[0] && data.students[0]['一寸照片']) {
    const photoInput = document.getElementById('photoFiles');
    photoInput.setAttribute('data-files', '已选择照片文件夹');
  }

  // 显示 Excel 文件已选择状态
  const excelInput = document.getElementById('folderInput');
  excelInput.setAttribute('data-files', '已选择报名名单');

  // 恢复之前的数据到全局变量
  studentData = data.students;
  photoFiles = data.photos;
  
  // 检查开始按钮状态
  checkStartCondition();
} 