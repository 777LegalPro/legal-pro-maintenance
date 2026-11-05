import React, {useState, useEffect} from 'react';
import {Catalog} from './Catalog.jsx';
import {Court} from './Courts.jsx';
import {Administration,Duma} from './Civic.jsx';
import {Vdpo} from './Vdpo.jsx';
import {ExternalLink} from './ui.jsx';
const pages={
 'central-court':{name:'Центральный районный суд',sub:'город Тюмень',mark:'ЦР',theme:'court',official:'https://centralny--tum.sudrf.ru/',nav:[['#cases','Дела'],['#schedule','Заседания'],['#prepare','Документы'],['#contacts','Контакты']]},
 'magistrate-2':{name:'Судебный участок № 2',sub:'Центральный судебный район г. Тюмени',mark:'02',theme:'magistrate',official:'https://cen2.tyum.msudrf.ru/',nav:[['#cases','Дела'],['#schedule','Заседания'],['#prepare','Обращение'],['#contacts','Контакты']]},
 'administration':{name:'Администрация Тюмени',sub:'Концепция городского портала',mark:'Т',theme:'admin',official:'https://tyumen-city.ru/',nav:[['#civic-admin-tasks','Решить вопрос'],['#civic-admin-structure','Структура'],['#civic-admin-sources','Обратиться']]},
 'duma':{name:'Тюменская городская Дума',sub:'Концепция открытого городского собрания',mark:'ТД',theme:'duma',official:'https://duma.tyumen-city.ru/',nav:[['#civic-duma-decisions','Решения'],['#civic-my-deputy','Мой депутат'],['#civic-appointment','Приём']]},
 'vdpo':{name:'Тюменское ВДПО',sub:'Общественная организация',mark:'В',theme:'vdpo',official:'https://vdpo-72.ru/',nav:[['#vdpo-route','Услуги'],['#vdpo-training','Обучение'],['#vdpo-contacts','Контакты']]}
};
export function App(){
 const parts=window.location.pathname.split('/').filter(Boolean);
 const slug=parts.find(p=>pages[p]);const page=pages[slug];
 const [large,setLarge]=useState(false);
 useEffect(()=>{document.documentElement.style.fontSize=large?'18px':'16px';return()=>{document.documentElement.style.fontSize='';};},[large]);
 useEffect(()=>{document.title=page?`${page.name} — прототип LEGAL PRO`:'Цифровая Тюмень — прототипы LEGAL PRO';},[slug]);
 const base=window.location.pathname.includes('/prototypes')?'/prototypes/':'/';
 return <div className={`app-shell theme-${page?.theme||'catalog'} ${large?'large-text':''}`}><a className="skip-link" href="#main">Перейти к содержанию</a><div className="demo-bar"><span><strong>Независимый прототип LEGAL PRO</strong><span className="demo-short"> · Учебные данные · Не официальный сайт</span></span><a href={`${base}#about`}>О проекте</a></div><header className="site-header"><div className="header-inner"><a className="brand" href={page?'./':base}><span className="brand-mark" aria-hidden="true">{page?.mark||'LP'}</span><span className="brand-name">{page?.name||'LEGAL PRO'}<span className="brand-sub">{page?.sub||'Лаборатория городских сервисов'}</span></span></a><div className="header-actions">{page&&<ExternalLink className="header-official" href={page.official}>Официальный сайт</ExternalLink>}<button className="access-toggle" onClick={()=>setLarge(!large)} aria-pressed={large} aria-label="Увеличить текст">Аа {large?'−':'+'}</button></div><nav className="header-nav" aria-label="Разделы страницы">{(page?.nav||[['#projects','Прототипы'],['#approach','Подход'],['#about','О проекте']]).map(([url,title])=><a href={url} key={url}>{title}</a>)}</nav></div></header><main className="content-frame" id="main">{page&&<div className="breadcrumb"><a href={base}>Все прототипы</a><span aria-hidden="true">/</span><span>{page.name}</span></div>}{!page?<Catalog/>:slug==='central-court'?<Court kind="district"/>:slug==='magistrate-2'?<Court kind="magistrate"/>:slug==='administration'?<Administration/>:slug==='duma'?<Duma/>:<Vdpo/>}</main><footer className="site-footer"><div className="footer-inner"><a className="footer-brand" href={base}>LEGAL <i>|</i> PRO</a><div className="footer-copy"><p>Независимая концепция «Цифровая Тюмень». Учебные данные и локальные демонстрационные действия.</p><p>Реальные обращения направляются через официальные ресурсы. Прототип не принимает персональные документы.</p></div><div className="footer-links"><a href={base}>Все 5 прототипов</a>{page&&<ExternalLink href={page.official}>Оригинал сайта</ExternalLink>}</div></div></footer></div>;
}
