// خادم آمن: يحتفظ بمفتاح API على الخادم ولا يرسله إلى الهاتف.
const express = require('express');
const path = require('path');
const app = express();
app.use(express.json({limit:'18mb'}));
app.use(express.static(path.join(__dirname)));
app.post('/api/summarize', async (req,res)=>{
  try {
    const {images,subject='',level=''} = req.body || {};
    if (!process.env.OPENAI_API_KEY) return res.status(503).json({error:'الخادم لم يُضبط بعد بمفتاح خدمة التلخيص.'});
    if (!Array.isArray(images) || !images.length || images.length>8) return res.status(400).json({error:'اختر من صورة إلى 8 صور واضحة.'});
    if (images.some(x=>typeof x!=='string' || !/^data:image\/(jpeg|jpg|png|webp);base64,/.test(x))) return res.status(400).json({error:'صيغة صورة غير مدعومة.'});
    const content=[{type:'input_text',text:`اقرأ صفحات الدرس المصوّرة بعناية، ثم أنشئ ملخّصاً تعليمياً دقيقاً باللغة العربية. المادة: ${subject||'غير محددة'}. المستوى: ${level||'غير محدد'}. نظّم الناتج بعناوين قصيرة: الفكرة العامة، أهم الأفكار، التعاريف والمصطلحات، التواريخ أو القواعد أو الأمثلة المهمة إن وجدت، ثم خلاصة قصيرة وأسئلة مراجعة. لا تخترع أي معلومة غير موجودة في الصور. إذا كان جزء غير واضح فاذكر ذلك صراحة ولا تخمّن. اجعل الملخص مناسباً لمراجعة التلميذ.`}];
    for (const image of images) content.push({type:'input_image',image_url:image,detail:'high'});
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-5.4-mini',input:[{role:'user',content}],max_output_tokens:2200,store:false})});
    const data=await response.json();
    if(!response.ok){console.error('AI service error',data);return res.status(502).json({error:'تعذّر على خدمة الذكاء الاصطناعي تحليل الصور حالياً.'})}
    const summary=(data.output||[]).filter(x=>x.type==='message').flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('\n').trim();
    if(!summary) return res.status(502).json({error:'لم يصل نصّ الملخّص. جرّب صوراً أوضح.'});
    res.json({summary});
  } catch(e){console.error(e);res.status(500).json({error:'حدث خطأ غير متوقع في الخادم.'})}
});
const port=process.env.PORT||3000;app.listen(port,()=>console.log(`Study helper server listening on ${port}`));
