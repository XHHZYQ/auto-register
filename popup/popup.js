let studentData = [];
let isPaused = false;
let currentIndex = 0;

document.getElementById('excelFile').addEventListener('change', handleFileSelect);
document.getElementById('startBtn').addEventListener('click', startProcess);
document.getElementById('pauseBtn').addEventListener('click', togglePause);

function handleFileSelect(event) {
  const file = event.target.files[0];
  const reader = new FileReader();

  reader.onload = function(e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      studentData = XLSX.utils.sheet_to_json(firstSheet);
      
      if (studentData.length > 0) {
        document.getElementById('startBtn').disabled = false;
        updateProgress(0, studentData.length);
      }
    } catch (error) {
      alert('Excel 文件解析失败，请检查文件格式！');
      console.error('Excel parsing error:', error);
    }
  };

  reader.readAsArrayBuffer(file);
}

function startProcess() {
  if (currentIndex >= studentData.length) {
    currentIndex = 0;
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
  
  // 发送消息给 content script
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'fillForm',
      data: student
    }, function(response) {
      if (response && response.success) {
        updateSuccessCount();
      } else {
        updateFailCount();
      }
      
      currentIndex++;
      updateProgress(currentIndex, studentData.length);
      
      // 延迟处理下一条数据，避免页面响应不及时
      setTimeout(processNext, 2000);
    });
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