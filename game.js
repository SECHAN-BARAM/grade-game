const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');

// 게임 상태
let totalScore = 0;
let totalBlocks = 0;
let fCount = 0; // F 학점 카운트
let gameOver = false;
const MAX_BLOCKS = 7; // 최대 획득 가능한 블록 수

// 학점 정보
const grades = {
    'A+': { score: 4.5, color: '#CC0000', probability: 0.05, speed: 20 },
    'A0': { score: 4.0, color: '#CC6600', probability: 0.07, speed: 18 },
    'B+': { score: 3.5, color: '#CCCC00', probability: 0.10, speed: 16 },
    'B0': { score: 3.0, color: '#006600', probability: 0.13, speed: 14 },
    'C+': { score: 2.5, color: '#0000CC', probability: 0.30, speed: 12 },
    'C0': { score: 2.0, color: '#330066', probability: 0.20, speed: 10 },
    'F': { score: 0.0, color: '#000000', probability: 0.15, speed: 20 }
};

// 교수 설정
const professor = {
    x: canvas.width / 2,
    y: 50,
    width: 80,
    height: 80,
    direction: 1, // 1: 오른쪽, -1: 왼쪽
    speed: 8, // 6에서 8로 증가
    speedChangeInterval: 2000, // 속도 변경 간격 (ms)
    lastSpeedChange: 0,
    margin: 20 // 벽과의 여유 공간
};

// 플레이어 설정
const player = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    width: 70,
    height: 70,
    speed: 8
};

// 떨어지는 블록 배열
let fallingBlocks = [];

// 블록 생성 설정
const blockSpawnConfig = {
    baseProbability: 0.3, // 기본 생성 확률 (0.5에서 0.3으로 감소)
    maxBlocksPerSpawn: 5, // 한 번에 생성할 수 있는 최대 블록 수 (7에서 5로 감소)
    spawnInterval: 300 // 블록 생성 간격 (ms) (200에서 300으로 증가)
};

// 마지막 블록 생성 시간
let lastBlockSpawnTime = 0;

// 키보드 입력 처리
const keys = {
    left: false,
    right: false,
    restart: false
};

// 모바일 터치 컨트롤 추가
const touchControls = {
    left: false,
    right: false
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
    if (e.key === 'r' || e.key === 'R') {
        keys.restart = true;
        if (gameOver) {
            resetGame();
        }
    }
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
    if (e.key === 'r' || e.key === 'R') keys.restart = false;
});

// 터치 이벤트 처리
document.addEventListener('touchstart', (e) => {
    e.preventDefault(); // 기본 스크롤 방지
    const touch = e.touches[0];
    const touchX = touch.clientX;
    const screenWidth = window.innerWidth;
    
    // 화면을 좌우로 나누어 터치 영역 설정
    if (touchX < screenWidth / 2) {
        touchControls.left = true;
    } else {
        touchControls.right = true;
    }
});

document.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchControls.left = false;
    touchControls.right = false;
});

// 모바일 버튼 컨트롤
const leftBtn = document.getElementById('leftBtn');
const rightBtn = document.getElementById('rightBtn');

if (leftBtn && rightBtn) {
    leftBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.left = true;
    });
    
    leftBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.left = false;
    });
    
    rightBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        touchControls.right = true;
    });
    
    rightBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        touchControls.right = false;
    });
}

// 교수 속도 변경
function updateProfessorSpeed() {
    const now = Date.now();
    if (now - professor.lastSpeedChange > professor.speedChangeInterval) {
        // 2 ~ 14 사이의 랜덤 속도 (기존 1.5 ~ 12에서 증가)
        professor.speed = 2 + Math.random() * 12;
        professor.lastSpeedChange = now;
    }
}

// 교수 이동
function updateProfessor() {
    updateProfessorSpeed();
    
    professor.x += professor.speed * professor.direction;
    
    // 화면 경계 체크 (여유 공간 추가)
    if (professor.x <= professor.margin || professor.x + professor.width >= canvas.width - professor.margin) {
        professor.direction *= -1; // 방향 전환
    }
}

// 블록 생성
function createBlock() {
    const random = Math.random();
    let selectedGrade = 'F';
    let cumulativeProbability = 0;

    for (const [grade, info] of Object.entries(grades)) {
        cumulativeProbability += info.probability;
        if (random <= cumulativeProbability) {
            selectedGrade = grade;
            break;
        }
    }

    return {
        x: professor.x + professor.width / 2 - 15, // 교수 위치에서 생성
        y: professor.y + professor.height, // 교수 아래에서 생성
        width: 30,
        height: 30,
        grade: selectedGrade,
        speed: grades[selectedGrade].speed
    };
}

// 여러 블록 생성
function spawnBlocks() {
    const now = Date.now();
    if (now - lastBlockSpawnTime < blockSpawnConfig.spawnInterval) {
        return; // 생성 간격이 지나지 않았으면 생성하지 않음
    }
    
    lastBlockSpawnTime = now;
    
    // 랜덤하게 1~3개의 블록 생성
    const numBlocks = Math.floor(Math.random() * blockSpawnConfig.maxBlocksPerSpawn) + 1;
    
    for (let i = 0; i < numBlocks; i++) {
        if (Math.random() < blockSpawnConfig.baseProbability) {
            fallingBlocks.push(createBlock());
        }
    }
}

// 수집한 학점 정보 저장 배열
let collectedGrades = [];

// 충돌 감지
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// 평균 학점 계산
function calculateAverage() {
    return totalBlocks > 0 ? (totalScore / totalBlocks).toFixed(2) : "0.00";
}

// 게임 업데이트
function update() {
    if (gameOver) return;
    
    // 교수 업데이트
    updateProfessor();
    
    // 플레이어 이동 (키보드 + 터치)
    if ((keys.left || touchControls.left) && player.x > 0) {
        player.x -= player.speed;
    }
    if ((keys.right || touchControls.right) && player.x < canvas.width - player.width) {
        player.x += player.speed;
    }
    
    // 블록 생성
    spawnBlocks();
    
    // 블록 이동 및 충돌 체크
    for (let i = fallingBlocks.length - 1; i >= 0; i--) {
        const block = fallingBlocks[i];
        block.y += block.speed;
        
        // 충돌 체크
        if (checkCollision(player, block)) {
            totalScore += grades[block.grade].score;
            totalBlocks++;
            
            // 수집한 학점 정보 저장
            collectedGrades.push(block.grade);
            
            // F 학점 카운트 증가
            if (block.grade === 'F') {
                fCount++;
                if (fCount >= 4) {
                    gameOver = true;
                    return;
                }
            }
            
            // 총 7개의 학점을 받으면 게임 종료
            if (totalBlocks >= MAX_BLOCKS) {
                gameOver = true;
                return;
            }
            
            fallingBlocks.splice(i, 1);
            scoreElement.textContent = `평균 학점: ${calculateAverage()} | F: ${fCount}/4 | 획득: ${totalBlocks}/${MAX_BLOCKS}`;
            continue;
        }
        
        // 화면 밖으로 나간 블록 제거
        if (block.y > canvas.height) {
            fallingBlocks.splice(i, 1);
        }
    }
}

// 이미지 로드
const playerImage = new Image();
playerImage.src = 'catgif.gif';
const professorImage = new Image();
professorImage.src = 'catgif2.gif';

// 이미지 로드 완료 확인
let imagesLoaded = 0;
const totalImages = 2;

function imageLoaded() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // 모든 이미지가 로드되면 게임 시작
        gameLoop();
    }
}

// 이미지 로드 실패 처리
function imageError() {
    imagesLoaded++;
    if (imagesLoaded === totalImages) {
        // 이미지 로드 실패 시에도 게임 시작
        console.log("이미지 로드 실패, 게임을 시작합니다.");
        gameLoop();
    }
}

playerImage.onload = imageLoaded;
professorImage.onload = imageLoaded;
playerImage.onerror = imageError;
professorImage.onerror = imageError;

// HTML 요소로 GIF 표시
const playerElement = document.createElement('img');
playerElement.src = 'catgif.gif';
playerElement.onerror = function() {
    // 이미지 로드 실패 시 대체 텍스트 표시
    this.style.display = 'none';
    const textElement = document.createElement('div');
    textElement.textContent = '플레이어';
    textElement.style.position = 'absolute';
    textElement.style.width = player.width + 'px';
    textElement.style.height = player.height + 'px';
    textElement.style.backgroundColor = '#3498db';
    textElement.style.color = 'white';
    textElement.style.display = 'flex';
    textElement.style.justifyContent = 'center';
    textElement.style.alignItems = 'center';
    textElement.style.fontWeight = 'bold';
    textElement.style.zIndex = '15';
    textElement.style.pointerEvents = 'none';
    document.body.appendChild(textElement);
    playerElement.textElement = textElement;
};

const professorElement = document.createElement('img');
professorElement.src = 'catgif2.gif';
professorElement.onerror = function() {
    // 이미지 로드 실패 시 대체 텍스트 표시
    this.style.display = 'none';
    const textElement = document.createElement('div');
    textElement.textContent = '교수';
    textElement.style.position = 'absolute';
    textElement.style.width = professor.width + 'px';
    textElement.style.height = professor.height + 'px';
    textElement.style.backgroundColor = '#e74c3c';
    textElement.style.color = 'white';
    textElement.style.display = 'flex';
    textElement.style.justifyContent = 'center';
    textElement.style.alignItems = 'center';
    textElement.style.fontWeight = 'bold';
    textElement.style.zIndex = '15';
    textElement.style.pointerEvents = 'none';
    document.body.appendChild(textElement);
    professorElement.textElement = textElement;
};

// HTML 요소로 GIF 표시
playerElement.style.position = 'absolute';
playerElement.style.width = player.width + 'px';
playerElement.style.height = player.height + 'px';
playerElement.style.zIndex = '15';
playerElement.style.pointerEvents = 'none'; // 마우스 이벤트 무시
document.body.appendChild(playerElement);

professorElement.style.position = 'absolute';
professorElement.style.width = professor.width + 'px';
professorElement.style.height = professor.height + 'px';
professorElement.style.zIndex = '15';
professorElement.style.pointerEvents = 'none'; // 마우스 이벤트 무시
document.body.appendChild(professorElement);

// 게임 제목 요소 생성
const titleElement = document.createElement('div');
titleElement.textContent = '교수님을 열심히 쫓아다니지만 학점은 골라받고 싶은 나:';
titleElement.style.position = 'absolute';
titleElement.style.top = '60px';
titleElement.style.left = '50%';
titleElement.style.transform = 'translateX(-50%)';
titleElement.style.fontSize = '24px';
titleElement.style.fontWeight = 'bold';
titleElement.style.zIndex = '20';
document.body.appendChild(titleElement);

// 수집한 학점 블록 표시 영역 생성
const collectedGradesElement = document.createElement('div');
collectedGradesElement.style.position = 'absolute';
collectedGradesElement.style.top = (canvas.offsetTop + canvas.height + 20) + 'px'; // 캔버스의 offsetTop 사용
collectedGradesElement.style.left = canvas.offsetLeft + 'px'; // 캔버스의 offsetLeft 사용
collectedGradesElement.style.width = canvas.width + 'px'; // 캔버스와 같은 너비
collectedGradesElement.style.height = '100px';
collectedGradesElement.style.border = '1px solid #000';
collectedGradesElement.style.padding = '10px';
collectedGradesElement.style.backgroundColor = '#f8f8f8';
collectedGradesElement.style.zIndex = '5'; // z-index를 낮춰서 플레이어 아래에 표시
document.body.appendChild(collectedGradesElement);

// 수집한 학점 블록 표시 제목
const collectedTitleElement = document.createElement('div');
collectedTitleElement.textContent = '수집한 학점';
collectedTitleElement.style.textAlign = 'center';
collectedTitleElement.style.fontWeight = 'bold';
collectedTitleElement.style.marginBottom = '10px';
collectedGradesElement.appendChild(collectedTitleElement);

// 수집한 학점 블록 컨테이너
const collectedBlocksContainer = document.createElement('div');
collectedBlocksContainer.style.display = 'flex';
collectedBlocksContainer.style.flexWrap = 'nowrap'; // 가로로 표시
collectedBlocksContainer.style.justifyContent = 'center';
collectedBlocksContainer.style.gap = '10px';
collectedBlocksContainer.style.overflowX = 'auto'; // 가로 스크롤 추가
collectedBlocksContainer.style.padding = '5px';
collectedGradesElement.appendChild(collectedBlocksContainer);

// Canvas 위치 가져오기
const canvasRect = canvas.getBoundingClientRect();

// 교수 그리기
function drawProfessor() {
    const isMobile = window.innerWidth <= 768;
    const scale = isMobile ? window.innerWidth / 800 : 1;
    const sizeScale = isMobile ? 0.7 : 1; // 모바일에서는 크기를 70%로 조정
    
    // HTML 요소 위치 업데이트 (Canvas 좌표 기준)
    // 모바일에서는 교수 위치를 상단에 고정
    const professorX = professor.x * scale;
    const professorY = isMobile ? 0 : professor.y * scale; // 모바일에서는 y 좌표를 0으로 설정
    
    professorElement.style.left = (canvasRect.left + professorX) + 'px';
    professorElement.style.top = (canvasRect.top + professorY) + 'px';
    
    // 이미지 로드 실패 시 대체 텍스트 위치 업데이트
    if (professorElement.textElement) {
        professorElement.textElement.style.left = (canvasRect.left + professorX) + 'px';
        professorElement.textElement.style.top = (canvasRect.top + professorY) + 'px';
    }
}

// 플레이어 그리기
function drawPlayer() {
    const isMobile = window.innerWidth <= 768;
    const scale = isMobile ? window.innerWidth / 800 : 1;
    const sizeScale = isMobile ? 0.8 : 1; // 모바일에서는 크기를 80%로 조정
    
    // HTML 요소 위치 업데이트 (Canvas 좌표 기준)
    playerElement.style.left = (canvasRect.left + player.x * scale) + 'px';
    playerElement.style.top = (canvasRect.top + player.y * scale) + 'px';
    
    // 이미지 로드 실패 시 대체 텍스트 위치 업데이트
    if (playerElement.textElement) {
        playerElement.textElement.style.left = (canvasRect.left + player.x * scale) + 'px';
        playerElement.textElement.style.top = (canvasRect.top + player.y * scale) + 'px';
    }
}

// 게임 렌더링
function draw() {
    // Canvas 위치 업데이트 (창 크기 변경 시 대응)
    const newCanvasRect = canvas.getBoundingClientRect();
    if (newCanvasRect.left !== canvasRect.left || newCanvasRect.top !== canvasRect.top) {
        canvasRect.left = newCanvasRect.left;
        canvasRect.top = newCanvasRect.top;
        
        // HTML 요소 위치 업데이트
        updateHTMLElementsPosition();
    }
    
    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 배경 그리기
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 블록 그리기
    fallingBlocks.forEach(block => {
        ctx.fillStyle = grades[block.grade].color;
        ctx.fillRect(block.x, block.y, block.width, block.height);
        
        // 학점 텍스트 그리기
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(block.grade, block.x + block.width/2, block.y + block.height/2);
    });
    
    // 교수와 플레이어 위치 업데이트
    drawProfessor();
    drawPlayer();
    
    // 점수 표시 업데이트
    const scoreText = `평균 학점: ${calculateAverage()} | F: ${fCount}/4 | 획득: ${totalBlocks}/${MAX_BLOCKS}`;
    scoreElement.textContent = scoreText;
    
    // 수집한 학점 블록 표시 업데이트
    updateCollectedGrades();
    
    // 게임 오버 메시지
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 40px Arial';
        ctx.textAlign = 'center';
        
        // F 학점 4개 받았을 때 학사경고 메시지
        if (fCount >= 4) {
            ctx.fillText('학사경고!', canvas.width/2, canvas.height/2 - 50);
            ctx.font = '24px Arial';
            ctx.fillText(`최종 평균 학점: ${calculateAverage()}`, canvas.width/2, canvas.height/2 + 20);
            ctx.fillText('다시 시작하려면 R 키를 누르세요', canvas.width/2, canvas.height/2 + 60);
        } else {
            // 일반 게임 종료 메시지
            ctx.fillText('학기 끝!', canvas.width/2, canvas.height/2 - 50);
            ctx.font = '24px Arial';
            ctx.fillText(`최종 평균 학점: ${calculateAverage()}`, canvas.width/2, canvas.height/2 + 20);
            ctx.fillText('다시 시작하려면 R 키를 누르세요', canvas.width/2, canvas.height/2 + 60);
        }
    }
}

// HTML 요소 위치 업데이트 함수
function updateHTMLElementsPosition() {
    const isMobile = window.innerWidth <= 768;
    const scale = isMobile ? window.innerWidth / 800 : 1;
    
    // 교수와 플레이어 위치 업데이트
    drawProfessor();
    drawPlayer();
    
    // 수집한 학점 영역 위치 업데이트
    if (collectedGradesElement) {
        if (isMobile) {
            collectedGradesElement.style.top = (canvasRect.top + canvas.height * scale + 10) + 'px';
        } else {
            collectedGradesElement.style.top = (canvasRect.top + canvas.height + 20) + 'px';
        }
        collectedGradesElement.style.left = canvasRect.left + 'px';
    }
    
    // 게임 제목 위치 업데이트
    if (titleElement) {
        if (isMobile) {
            titleElement.style.top = (canvasRect.top - 30) + 'px';
        } else {
            titleElement.style.top = '60px';
        }
    }
    
    // 점수 표시 위치 업데이트
    if (scoreElement && isMobile) {
        scoreElement.style.top = (canvasRect.top - 10) + 'px';
    }
}

// 수집한 학점 블록 표시 업데이트
function updateCollectedGrades() {
    // 기존 블록 제거
    collectedBlocksContainer.innerHTML = '';
    
    // 수집한 학점 블록 표시
    for (let i = 0; i < collectedGrades.length; i++) {
        const grade = collectedGrades[i];
        const blockElement = document.createElement('div');
        
        // 모바일 화면에서 블록 크기 조정
        const isMobile = window.innerWidth <= 768;
        const blockSize = isMobile ? '30px' : '40px';
        
        blockElement.style.width = blockSize;
        blockElement.style.height = blockSize;
        blockElement.style.backgroundColor = grades[grade].color;
        blockElement.style.display = 'flex';
        blockElement.style.justifyContent = 'center';
        blockElement.style.alignItems = 'center';
        blockElement.style.color = '#FFFFFF';
        blockElement.style.fontWeight = 'bold';
        blockElement.style.fontSize = isMobile ? '12px' : '14px';
        blockElement.style.borderRadius = '5px';
        blockElement.style.flexShrink = '0'; // 크기 고정
        
        // 학점 텍스트
        blockElement.textContent = grade;
        
        collectedBlocksContainer.appendChild(blockElement);
    }
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 게임 재시작 함수
function resetGame() {
    // 게임 상태 초기화
    totalScore = 0;
    totalBlocks = 0;
    fCount = 0;
    gameOver = false;
    fallingBlocks = [];
    collectedGrades = []; // 수집한 학점 정보 초기화
    
    // 플레이어 위치 초기화
    player.x = canvas.width / 2;
    player.y = canvas.height - 100;
    
    // 교수 위치 초기화
    professor.x = canvas.width / 2;
    professor.y = 50;
    professor.direction = 1;
    professor.speed = 8;
    
    // 점수 표시 초기화
    scoreElement.textContent = `평균 학점: 0.00 | F: 0/4 | 획득: 0/${MAX_BLOCKS}`;
    
    // 수집한 학점 블록 초기화
    updateCollectedGrades();
}

// 게임 시작 (이미지 로드 완료 후 자동으로 시작됨)
// gameLoop(); // 이 줄은 제거하거나 주석 처리합니다 

// 모바일 최적화를 위한 캔버스 크기 조정
function resizeCanvas() {
    const isMobile = window.innerWidth <= 768;
    if (isMobile) {
        // 9:16 비율 계산
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const aspectRatio = 9/16;
        
        // 화면 너비에 맞게 조정하되 9:16 비율 유지
        let canvasWidth = screenWidth;
        let canvasHeight = screenWidth / aspectRatio;
        
        // 화면 높이가 충분하지 않으면 높이에 맞게 조정
        if (canvasHeight > screenHeight * 0.8) {
            canvasHeight = screenHeight * 0.8;
            canvasWidth = canvasHeight * aspectRatio;
        }
        
        // 캔버스 크기 설정
        canvas.style.width = canvasWidth + 'px';
        canvas.style.height = canvasHeight + 'px';
        
        // 스케일 계산
        const scale = canvasWidth / 800; // 800은 기본 캔버스 너비
        
        // 모바일에서 더 큰 터치 영역을 위한 컨트롤 버튼 추가
        if (!document.getElementById('mobileControls')) {
            const controls = document.createElement('div');
            controls.id = 'mobileControls';
            controls.style.position = 'fixed';
            controls.style.bottom = '20px';
            controls.style.left = '0';
            controls.style.right = '0';
            controls.style.display = 'flex';
            controls.style.justifyContent = 'space-between';
            controls.style.padding = '0 20px';
            controls.style.zIndex = '30';
            
            const leftBtn = document.createElement('div');
            leftBtn.style.width = '60px';
            leftBtn.style.height = '60px';
            leftBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            leftBtn.style.borderRadius = '50%';
            leftBtn.style.display = 'flex';
            leftBtn.style.justifyContent = 'center';
            leftBtn.style.alignItems = 'center';
            leftBtn.style.fontSize = '20px';
            leftBtn.textContent = '←';
            
            const rightBtn = document.createElement('div');
            rightBtn.style.width = '60px';
            rightBtn.style.height = '60px';
            rightBtn.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
            rightBtn.style.borderRadius = '50%';
            rightBtn.style.display = 'flex';
            rightBtn.style.justifyContent = 'center';
            rightBtn.style.alignItems = 'center';
            rightBtn.style.fontSize = '20px';
            rightBtn.textContent = '→';
            
            controls.appendChild(leftBtn);
            controls.appendChild(rightBtn);
            document.body.appendChild(controls);
        }
        
        // 모바일에서 이미지 크기 조정 (더 작게)
        if (playerElement) {
            playerElement.style.width = (player.width * scale * 0.7) + 'px';
            playerElement.style.height = (player.height * scale * 0.7) + 'px';
        }
        
        if (professorElement) {
            professorElement.style.width = (professor.width * scale * 0.7) + 'px';
            professorElement.style.height = (professor.height * scale * 0.7) + 'px';
            // 교수 이미지가 상단에 표시되도록 z-index 설정
            professorElement.style.zIndex = '15';
        }
        
        // 대체 텍스트 크기 조정
        if (playerElement && playerElement.textElement) {
            playerElement.textElement.style.width = (player.width * scale * 0.7) + 'px';
            playerElement.textElement.style.height = (player.height * scale * 0.7) + 'px';
        }
        
        if (professorElement && professorElement.textElement) {
            professorElement.textElement.style.width = (professor.width * scale * 0.7) + 'px';
            professorElement.textElement.style.height = (professor.height * scale * 0.7) + 'px';
            // 교수 텍스트가 상단에 표시되도록 z-index 설정
            professorElement.textElement.style.zIndex = '15';
        }
        
        // 수집한 학점 영역 크기 조정
        if (collectedGradesElement) {
            collectedGradesElement.style.width = canvasWidth + 'px';
            collectedGradesElement.style.height = '80px'; // 높이 감소
            collectedGradesElement.style.top = (canvasRect.top + canvasHeight + 10) + 'px';
            collectedGradesElement.style.left = canvasRect.left + 'px';
            collectedGradesElement.style.zIndex = '10';
            collectedGradesElement.style.fontSize = '12px'; // 글꼴 크기 감소
        }
        
        // 게임 제목 위치 조정
        if (titleElement) {
            titleElement.style.top = (canvasRect.top - 30) + 'px';
            titleElement.style.fontSize = '16px';
            titleElement.style.width = '90%';
            titleElement.style.textAlign = 'center';
        }
        
        // 점수 표시 위치 조정
        if (scoreElement) {
            scoreElement.style.position = 'absolute';
            scoreElement.style.top = (canvasRect.top - 10) + 'px';
            scoreElement.style.left = '50%';
            scoreElement.style.transform = 'translateX(-50%)';
            scoreElement.style.fontSize = '14px';
            scoreElement.style.zIndex = '20';
        }
    } else {
        // 데스크톱에서는 원래 크기로
        canvas.style.width = '800px';
        canvas.style.height = '600px';
        
        // 데스크톱에서 이미지 크기 원래대로
        if (playerElement) {
            playerElement.style.width = player.width + 'px';
            playerElement.style.height = player.height + 'px';
        }
        
        if (professorElement) {
            professorElement.style.width = professor.width + 'px';
            professorElement.style.height = professor.height + 'px';
        }
        
        // 대체 텍스트 크기 원래대로
        if (playerElement && playerElement.textElement) {
            playerElement.textElement.style.width = player.width + 'px';
            playerElement.textElement.style.height = player.height + 'px';
        }
        
        if (professorElement && professorElement.textElement) {
            professorElement.textElement.style.width = professor.width + 'px';
            professorElement.textElement.style.height = professor.height + 'px';
        }
        
        // 수집한 학점 영역 크기 원래대로
        if (collectedGradesElement) {
            collectedGradesElement.style.width = canvas.width + 'px';
            collectedGradesElement.style.height = '100px';
            collectedGradesElement.style.top = (canvasRect.top + canvas.height + 20) + 'px';
            collectedGradesElement.style.left = canvasRect.left + 'px';
            collectedGradesElement.style.zIndex = '5';
            collectedGradesElement.style.fontSize = '16px';
        }
        
        // 게임 제목 위치 원래대로
        if (titleElement) {
            titleElement.style.top = '60px';
            titleElement.style.fontSize = '24px';
            titleElement.style.width = 'auto';
        }
        
        // 점수 표시 위치 원래대로
        if (scoreElement) {
            scoreElement.style.position = 'static';
            scoreElement.style.fontSize = '24px';
        }
        
        // 모바일 컨트롤 제거
        const mobileControls = document.getElementById('mobileControls');
        if (mobileControls) {
            mobileControls.remove();
        }
    }
    
    // 캔버스 위치 업데이트
    canvasRect = canvas.getBoundingClientRect();
    
    // HTML 요소 위치 업데이트
    updateHTMLElementsPosition();
}

// 게임 시작 시 캔버스 크기 조정
resizeCanvas();
window.addEventListener('resize', resizeCanvas); 