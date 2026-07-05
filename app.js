const MODEL_URL = "./model/"; 
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwOrO6Rie3MDstS9qow6D_bXfAHuoEM7AnvfP_nDED39WMsOrhWPneSbkD_RieTrOEmqw/exec"; 

const EMISSION_DATABASE = {
    "Class 0": { name: "ขวดพลาสติก PET", weight: 0.020, ef_landfill: 2.91, ef_recycle: 1.20, bin: "ถังสีน้ำเงิน (ขยะรีไซเคิล)", color: "bg-blue-100 text-blue-800 border-blue-300" },
    "Class 1": { name: "กล่องนมกระดาษ", weight: 0.012, ef_landfill: 1.85, ef_recycle: 0.65, bin: "ถังสีน้ำเงิน (ขยะรีไซเคิล)", color: "bg-blue-100 text-blue-800 border-blue-300" },
    "Class 2": { name: "กระดาษใบงาน", weight: 0.005, ef_landfill: 1.21, ef_recycle: 0.32, bin: "ถังสีน้ำเงิน (ขยะรีไซเคิล)", color: "bg-blue-100 text-blue-800 border-blue-300" },
    "Class 3": { name: "เศษอาหาร/ขยะทั่วไป", weight: 0.050, ef_landfill: 1.48, ef_recycle: 1.48, bin: "ถังสีเขียว หรือถังขยะเปียก", color: "bg-green-100 text-green-800 border-green-300" }
};

let model, webcam, currentClassId = null, isModelLoaded = false;

async function init() {
    try {
        model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
        isModelLoaded = true;
        document.getElementById("loading-status").classList.add("hidden");
        webcam = new tmImage.Webcam(350, 350, true);
        await webcam.setup({ facingMode: "environment" }); 
        await webcam.play();
        window.requestAnimationFrame(loop);
    } catch (error) {
        document.getElementById("loading-status").innerText = "ไม่สามารถเข้าถึงกล้องหรือโมเดลได้";
    }
}

async function loop() {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    if (!isModelLoaded) return;
    const prediction = await model.predict(webcam.canvas);
    let highestPrediction = prediction.reduce((max, p) => p.probability > max.probability ? p : max, prediction[0]);

    if (highestPrediction.probability > 0.75) {
        const classKey = highestPrediction.className; 
        const info = EMISSION_DATABASE[classKey];
        if (info) {
            currentClassId = classKey;
            document.getElementById("prediction-result").innerText = info.name;
            document.getElementById("prediction-confidence").innerText = `ความแม่นยำ: ${(highestPrediction.probability * 100).toFixed(1)}%`;

            const guideBox = document.getElementById("sorting-guide");
            guideBox.className = `w-full p-3 rounded-lg text-sm border ${info.color}`;
            guideBox.innerHTML = `💡 <b>วิธีจัดการ:</b> ทิ้งลง <b>${info.bin}</b>`;
            guideBox.classList.remove("hidden");

            const btnSubmit = document.getElementById("btn-submit");
            btnSubmit.disabled = false;
            btnSubmit.className = "w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow cursor-pointer";
        }
    }
}

document.getElementById("btn-submit").addEventListener("click", async () => {
    if (!currentClassId) return;
    const info = EMISSION_DATABASE[currentClassId];
    const quantity = 1; 
    const carbonSaved = quantity * info.weight * (info.ef_landfill - info.ef_recycle);

    const payload = {
        timestamp: new Date().toLocaleString('th-TH'),
        class_id: currentClassId,
        waste_type: info.name,
        weight_kg: (quantity * info.weight).toFixed(3),
        carbon_saved_kg: carbonSaved.toFixed(4),
        classroom: "ม.2/1"
    };

    const btnSubmit = document.getElementById("btn-submit");
    btnSubmit.innerText = "กำลังบันทึกข้อมูล...";
    btnSubmit.disabled = true;

    try {
        await fetch(GOOGLE_SCRIPT_URL, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(payload)
        });
        alert(`🎉 สำเร็จ! คุณช่วยลดคาร์บอนได้ ${carbonSaved.toFixed(4)} kgCO2e`);
    } catch (error) {
        console.error(error);
    } finaly {
        btnSubmit.innerText = "ยืนยันการทิ้งขยะ & บันทึกสถิติ";
        btnSubmit.disabled = false;
    }
});

window.onload = init;