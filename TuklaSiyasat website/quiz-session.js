/* A single sequential attempt. Accept one answer, then advance after feedback. */
(function(root){
 'use strict';
 function createSession(questions,saved){
  if(!Array.isArray(questions)||!questions.length)throw Error('This quiz has no questions.');
  for(const q of questions)if(!q||!Array.isArray(q.options)||q.options.length<2||!Number.isInteger(q.answer)||q.answer<0||q.answer>=q.options.length)throw Error('A quiz answer key is incomplete.');
  let index=0,phase='question',answers=[];
  if(saved&&Array.isArray(saved.answers)&&saved.answers.length<=questions.length){
   for(let i=0;i<saved.answers.length;i++){
    const value=saved.answers[i];if(!Number.isInteger(value)||value<0||value>=questions[i].options.length)break;
    answers.push(value);
   }
   index=answers.length;
   if(answers.length===questions.length&&saved.phase==='complete')phase='complete';
   else if(answers.length&&saved.phase==='feedback'){index=answers.length-1;phase='feedback';}
   else if(index===questions.length){index--;phase='feedback';}
  }
  const snapshot=()=>({index,phase,answers:answers.slice(),total:questions.length,score:answers.reduce((n,a,i)=>n+Number(a===questions[i].answer),0)});
  return {
   snapshot,
   choose(value){if(phase!=='question'||!Number.isInteger(value)||value<0||value>=questions[index].options.length)return false;answers.push(value);phase='feedback';return true;},
   advance(){if(phase!=='feedback')return false;index++;phase=index===questions.length?'complete':'question';return true;}
  };
 }
 root.TuklaQuizSession={create:createSession};
 if(typeof module!=='undefined'&&module.exports)module.exports=root.TuklaQuizSession;
})(typeof window==='undefined'?globalThis:window);
