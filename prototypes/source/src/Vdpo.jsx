import React, { useEffect, useRef, useState } from 'react';
import { Dialog, ExternalLink, Pill, SectionHeading, downloadText } from './ui.jsx';
import './Vdpo.css';

const OFFICIAL = 'https://vdpo-72.ru/';
const DIRECTORY = 'https://www.vdpo.ru/main/regionalnie-otdeleniya-vdpo/uralskii-federalnii-okrug/tyumenskoe-oblastnoe-otdelenie-vdpo.html';

const SERVICES = [
  { id: 'equipment', number: '01', title: 'Подобрать оборудование', short: 'Оборудование', text: 'Собрать исходные данные для подбора средств пожарной безопасности.', action: 'Подготовить запрос', result: 'Основа для подбора оборудования', checklist: ['Опишите помещения и их назначение.', 'Подготовьте план или сведения о площади объекта.', 'Составьте список уже установленного оборудования.', 'Запишите вопросы о подборе, размещении и обслуживании.'], next: 'Передайте исходные данные специалисту. Состав оборудования и стоимость можно определить после уточнения задачи.' },
  { id: 'service', number: '02', title: 'Организовать обслуживание', short: 'Обслуживание', text: 'Понять, что подготовить для обсуждения проверки и обслуживания.', action: 'Собрать информацию', result: 'Чек-лист для обсуждения обслуживания', checklist: ['Укажите типы и количество оборудования.', 'Найдите паспорта и доступные сведения о предыдущем обслуживании.', 'Опишите замечания, неисправности или цель обращения.', 'Уточните условия доступа к оборудованию на объекте.'], next: 'Обсудите со специалистом состав работ, возможность выезда и расчёт стоимости.' },
  { id: 'training', number: '03', title: 'Выбрать обучение', short: 'Обучение', text: 'Сформулировать задачу обучения для руководителя или команды.', action: 'Наметить маршрут', result: 'Данные для выбора обучения', checklist: ['Определите роли и задачи будущих слушателей.', 'Уточните, какое обучение уже проходила команда.', 'Подготовьте предполагаемое количество слушателей.', 'Запишите вопросы о программе, формате и подтверждающих документах.'], next: 'Согласуйте подходящую программу с учебным подразделением. Пример маршрута ниже помогает подготовиться к разговору.' },
];

const OBJECTS = [
  { id: 'office', title: 'Офис или услуги', text: 'Рабочие помещения, студия, сервис', hint: 'Для разговора пригодится информация о помещениях и характере работы.' },
  { id: 'retail', title: 'Магазин или кафе', text: 'Торговля и общественное питание', hint: 'Опишите особенности помещений и оборудования вашего объекта.' },
  { id: 'education', title: 'Учебный или детский центр', text: 'Занятия, обучение, досуг', hint: 'Укажите назначение помещений и особенности их использования.' },
  { id: 'home', title: 'Дом или другой объект', text: 'Жилое помещение, склад, иная задача', hint: 'Кратко опишите объект своими словами — точную задачу поможет уточнить специалист.' },
];

const TRAINING = [
  { id: 'responsible', audience: 'Ответственному', title: 'Организовать работу на объекте', intro: 'Пример маршрута для человека, который координирует вопросы пожарной безопасности.', modules: ['Устройство работы на объекте', 'Документы и взаимодействие с командой', 'Разбор ситуаций и вопросов'] },
  { id: 'manager', audience: 'Руководителю', title: 'Понять задачи и ответственность', intro: 'Пример маршрута для руководителя организации или подразделения.', modules: ['Задачи руководителя и команды', 'Планирование работ и взаимодействие со специалистами', 'Разбор практических ситуаций'] },
  { id: 'team', audience: 'Сотрудникам', title: 'Разобраться в понятных действиях', intro: 'Пример маршрута для знакомства команды с вопросами пожарной безопасности.', modules: ['Особенности своего рабочего места', 'Знакомство с инструкциями объекта', 'Вопросы и практический разбор'] },
];

function routeText(service, object, checked) {
  return [
    'LEGAL PRO · Цифровая Тюмень',
    'ВДПО — независимый учебный прототип',
    '',
    service.result,
    `Задача: ${service.title}`,
    `Тип объекта: ${object.title}`,
    '',
    'Что подготовить для разговора со специалистом:',
    ...service.checklist.map((line, index) => `${checked.includes(index) ? '[x]' : '[ ]'} ${line}`),
    '',
    `Следующий шаг: ${service.next}`,
    '',
    'Официальный сайт: https://vdpo-72.ru/',
    'Телефон: +7 (3452) 43-02-72',
    'Адрес: г. Тюмень, ул. Бакинских Комиссаров, 8',
    '',
    'Это пример подготовки обращения, а не заключение о соответствии объекта требованиям пожарной безопасности. Заявка не отправлена. Перечень не является исчерпывающим; состав работ, программы и стоимость уточняются в организации.',
  ].join('\n');
}

export function Vdpo() {
  const [serviceId, setServiceId] = useState('equipment');
  const [objectId, setObjectId] = useState('');
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState([]);
  const [downloaded, setDownloaded] = useState(false);
  const [trainingId, setTrainingId] = useState('responsible');
  const [planOpen, setPlanOpen] = useState(false);
  const [planDownloaded, setPlanDownloaded] = useState(false);
  const routeRef = useRef(null);
  const stepTitleRef = useRef(null);
  const previousStepRef = useRef(step);

  const service = SERVICES.find(item => item.id === serviceId);
  const object = OBJECTS.find(item => item.id === objectId);
  const training = TRAINING.find(item => item.id === trainingId);

  useEffect(() => {
    if (previousStepRef.current !== step) stepTitleRef.current?.focus({ preventScroll: true });
    previousStepRef.current = step;
  }, [step]);

  function chooseService(id) {
    setServiceId(id);
    setStep(1);
    setChecked([]);
    setDownloaded(false);
    routeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    routeRef.current?.focus({ preventScroll: true });
  }

  function setService(id) {
    setServiceId(id);
    setChecked([]);
    setDownloaded(false);
  }

  function selectObject(id) {
    setObjectId(id);
    setChecked([]);
    setDownloaded(false);
  }

  function toggleItem(index) {
    setChecked(current => current.includes(index) ? current.filter(item => item !== index) : [...current, index]);
    setDownloaded(false);
  }

  function saveChecklist() {
    if (!object) return;
    downloadText('VDPO-chek-list.txt', routeText(service, object, checked));
    setDownloaded(true);
  }

  function saveTrainingPlan() {
    downloadText('VDPO-uchebnyy-marshrut.txt', [
      'LEGAL PRO · Независимый прототип ВДПО',
      'Пример учебного маршрута',
      '',
      training.title,
      training.intro,
      '',
      ...training.modules.map((module, index) => `${index + 1}. ${module}`),
      '',
      'Это демонстрационная структура, а не действующая образовательная программа. Состав обучения, требования к слушателям, продолжительность, документы и стоимость уточняются в организации.',
      'Официальный сайт: https://vdpo-72.ru/',
      'Телефон: +7 (3452) 43-02-72',
      'Запись на обучение не выполнена.',
    ].join('\n'));
    setPlanDownloaded(true);
  }

  return <div className="vdpo-page">
    <section className="page-hero vdpo-hero" aria-labelledby="vdpo-title">
      <div className="hero-copy">
        <p className="hero-kicker vdpo-kicker"><span aria-hidden="true" /> Тюмень · Общественная организация</p>
        <h1 id="vdpo-title">Пожарная безопасность.<br /><span>Понятно, по делу.</span></h1>
        <p className="hero-lead">Оборудование, обслуживание и обучение — начните со своей задачи. Поможем собрать вопросы для специалиста.</p>
        <div className="hero-actions"><a className="button primary" href="#vdpo-route">Подобрать следующий шаг <span aria-hidden="true">↓</span></a><ExternalLink href={OFFICIAL} className="button secondary">Официальный сайт</ExternalLink></div>
        <p className="vdpo-hero-caption">Концепция сервисного портала Тюменского ВДПО</p>
      </div>
      <aside className="vdpo-start-panel" aria-label="Быстрый выбор задачи">
        <div className="vdpo-panel-heading"><span className="vdpo-caption">С чего начнём?</span><span className="vdpo-small-label">Три направления</span></div>
        <h2>Ваша задача —<br />первый шаг.</h2>
        <div className="vdpo-quick-list">{SERVICES.map(item => <button key={item.id} className="vdpo-quick-button" onClick={() => chooseService(item.id)}><span className="vdpo-quick-number">{item.number}</span><span>{item.title}</span><span className="vdpo-quick-arrow" aria-hidden="true">↗</span></button>)}</div>
        <div className="vdpo-panel-footer"><span>Для дома и бизнеса</span><span>Без сложных терминов</span></div>
      </aside>
    </section>

    <nav className="vdpo-jump-nav" aria-label="Разделы прототипа ВДПО">
      <a href="#vdpo-route"><span>01</span> Подбор задачи</a>
      <a href="#vdpo-training"><span>02</span> Обучение</a>
      <a href="#vdpo-contacts"><span>03</span> Контакты</a>
    </nav>

    <section className="section vdpo-route" id="vdpo-route" ref={routeRef} tabIndex={-1} aria-labelledby="vdpo-route-title">
      <div className="section-heading"><div><p className="eyebrow">От вопроса к действию</p><h2 id="vdpo-route-title">Подберите следующий шаг</h2><p className="section-description">Выберите задачу и тип объекта. Получите короткий список того, что подготовить.</p></div><Pill>Учебный сценарий</Pill></div>
      <div className="vdpo-route-shell">
        <ol className="vdpo-progress" aria-label="Шаги подбора">{['Ваша задача', 'Тип объекта', 'Следующий шаг'].map((label, index) => <li key={label} className={step === index ? 'is-current' : step > index ? 'is-complete' : ''}><button onClick={() => setStep(index)} disabled={index > step} aria-current={step === index ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}</span>{label}</button></li>)}</ol>
        <div className="vdpo-route-content">
          {step === 0 && <>
            <div className="vdpo-step-heading"><span className="eyebrow">Шаг 1 из 3</span><h3 ref={stepTitleRef} tabIndex={-1}>Что нужно сделать?</h3><p>Можно вернуться и изменить выбор на любом шаге.</p></div>
            <fieldset className="vdpo-choice-grid vdpo-service-choices"><legend className="sr-only">Выберите задачу</legend>{SERVICES.map(item => <label className={`vdpo-choice ${serviceId === item.id ? 'is-selected' : ''}`} key={item.id}><input type="radio" name="vdpo-task" value={item.id} checked={serviceId === item.id} onChange={() => setService(item.id)} /><span className="vdpo-choice-heading">{item.short}</span><span className="vdpo-choice-text">{item.text}</span></label>)}</fieldset>
            <div className="vdpo-route-actions"><p className="muted small-text">Никакие данные не отправляются.</p><button className="button primary" onClick={() => setStep(1)}>Далее: тип объекта <span aria-hidden="true">→</span></button></div>
          </>}
          {step === 1 && <>
            <div className="vdpo-step-heading"><span className="eyebrow">Шаг 2 из 3 · {service.short}</span><h3 ref={stepTitleRef} tabIndex={-1}>Для какого объекта?</h3><p>Выберите наиболее близкий вариант — для примера не нужен точный адрес.</p></div>
            <fieldset className="vdpo-choice-grid vdpo-object-choices"><legend className="sr-only">Выберите тип объекта</legend>{OBJECTS.map(item => <label className={`vdpo-choice ${objectId === item.id ? 'is-selected' : ''}`} key={item.id}><input type="radio" name="vdpo-object" value={item.id} checked={objectId === item.id} onChange={() => selectObject(item.id)} /><span className="vdpo-choice-heading">{item.title}</span><span className="vdpo-choice-text">{item.text}</span></label>)}</fieldset>
            <div className="vdpo-route-actions"><button className="button quiet" onClick={() => setStep(0)}><span aria-hidden="true">←</span> Изменить задачу</button><button className="button primary" disabled={!objectId} onClick={() => setStep(2)}>Получить чек-лист <span aria-hidden="true">→</span></button></div>
          </>}
          {step === 2 && object && <div className="vdpo-result">
            <div className="vdpo-step-heading"><span className="eyebrow">Шаг 3 из 3 · Ваш маршрут</span><h3 ref={stepTitleRef} tabIndex={-1}>{service.result}</h3><div className="vdpo-result-tags"><Pill>{service.short}</Pill><Pill>{object.title}</Pill></div></div>
            <div className="vdpo-result-grid">
              <div><div className="vdpo-check-heading"><h4>Что подготовить</h4><span aria-live="polite">{checked.length} из {service.checklist.length}</span></div><div className="vdpo-checklist">{service.checklist.map((item, index) => <label key={`${service.id}-${index}`} className={checked.includes(index) ? 'is-checked' : ''}><input type="checkbox" checked={checked.includes(index)} onChange={() => toggleItem(index)} /><span>{item}</span></label>)}</div></div>
              <aside className="vdpo-next-panel"><span className="eyebrow">Дальше — со специалистом</span><h4>Обсудите свою задачу</h4><p>{service.next}</p><p className="vdpo-object-hint">{object.hint}</p>{service.id === 'training' ? <a className="text-link" href="#vdpo-training">Посмотреть пример обучения <span aria-hidden="true">↓</span></a> : <ExternalLink href={OFFICIAL}>Перейти на сайт ВДПО</ExternalLink>}</aside>
            </div>
            <div className="vdpo-route-actions"><button className="button quiet" onClick={() => setStep(1)}><span aria-hidden="true">←</span> Изменить объект</button><button className="button primary" onClick={saveChecklist}>Скачать чек-лист <span aria-hidden="true">↓</span></button></div>
            <p className="vdpo-download-status" role="status">{downloaded ? 'Чек-лист подготовлен к скачиванию. Обращение в ВДПО не отправлено.' : 'Чек-лист — основа для разговора, а не заключение о соответствии объекта требованиям.'}</p>
          </div>}
        </div>
      </div>
    </section>

    <section className="section vdpo-training" id="vdpo-training" aria-labelledby="vdpo-training-title">
      <div className="section-heading"><div><p className="eyebrow">Обучение</p><h2 id="vdpo-training-title">Сначала задача.<br />Затем программа.</h2><p className="section-description">Показываем, как может выглядеть выбор обучения под роль человека.</p></div><Pill>Пример маршрута</Pill></div>
      <div className="vdpo-training-layout">
        <div className="vdpo-training-selector"><h3>Для кого выбираем?</h3><div className="vdpo-audience-list" role="group" aria-label="Роль слушателя">{TRAINING.map((item, index) => <button key={item.id} aria-pressed={trainingId === item.id} className={trainingId === item.id ? 'is-active' : ''} onClick={() => { setTrainingId(item.id); setPlanDownloaded(false); }}><span className="vdpo-audience-number">0{index + 1}</span><span>{item.audience}</span><span aria-hidden="true">→</span></button>)}</div><p>Действующие программы, требования к слушателям и стоимость уточняйте в организации.</p><ExternalLink href={OFFICIAL}>Открыть официальный сайт</ExternalLink></div>
        <article className="vdpo-program" aria-live="polite">
          <div className="vdpo-program-topline"><span className="vdpo-caption">Учебный пример</span><span className="vdpo-program-code">ВДПО / ОБУЧЕНИЕ</span></div>
          <h3>{training.title}</h3><p className="vdpo-program-intro">{training.intro}</p>
          <ol className="vdpo-modules">{training.modules.map((module, index) => <li key={`${training.id}-${index}`}><span>0{index + 1}</span><span>{module}</span></li>)}</ol>
          <div className="vdpo-program-footer"><span>План для обсуждения<br /><strong>Без записи на обучение</strong></span><button className="button primary" onClick={() => { setPlanOpen(true); setPlanDownloaded(false); }}>Посмотреть план <span aria-hidden="true">↗</span></button></div>
        </article>
      </div>
    </section>

    <section className="section vdpo-explain" aria-label="Перед обращением">
      <SectionHeading eyebrow="Перед обращением" title="Коротко о следующем шаге" />
      <div className="vdpo-faq">
        <details><summary>Как узнать стоимость оборудования и работ?</summary><p>Подготовьте сведения об объекте и задаче. Состав оборудования, работ и цену уточняет организация после обсуждения запроса. В этом прототипе нет действующего прайс-листа.</p></details>
        <details><summary>Чек-листа достаточно для проверки объекта?</summary><p>Нет. Это пример подготовки вопросов к специалисту. Он не заменяет обследование, профессиональную оценку и проверку применимых требований.</p></details>
        <details><summary>Здесь можно отправить заявку или записаться?</summary><p>Это независимый демонстрационный сайт LEGAL PRO. Мастер и учебный план работают как примеры; заявки и записи не отправляются. Для реального обращения используйте официальный сайт или контакты отделения.</p><ExternalLink href={OFFICIAL}>Официальный сайт ВДПО</ExternalLink></details>
      </div>
    </section>

    <section className="section vdpo-contacts" id="vdpo-contacts" aria-labelledby="vdpo-contacts-title">
      <div className="vdpo-contact-copy"><p className="eyebrow">Официальные контакты</p><h2 id="vdpo-contacts-title">Нужен разговор<br />со специалистом?</h2><p>Тюменское областное отделение ВДПО.<br />Общественная организация.</p><ExternalLink href={OFFICIAL} className="button vdpo-contact-button">Перейти на официальный сайт</ExternalLink></div>
      <div className="vdpo-contact-details"><div><span>Телефон</span><a className="vdpo-phone" href="tel:+73452430272">+7 (3452) 43-02-72</a></div><div><span>Электронная почта</span><a href="mailto:vdpo_tyumen@mail.ru">vdpo_tyumen@mail.ru</a></div><div><span>Адрес</span><p>г. Тюмень,<br />ул. Бакинских Комиссаров, 8</p></div></div>
    </section>
    <p className="source-note vdpo-source"><span>Контакты: </span><ExternalLink href={DIRECTORY}>карточка отделения на сайте ВДПО</ExternalLink><span> · Сценарии и учебные планы на этой странице — демонстрационные.</span></p>

    {planOpen && <Dialog title={training.title} label="Пример учебного маршрута" onClose={() => setPlanOpen(false)}>
      <p className="muted">{training.intro}</p><ol className="vdpo-dialog-modules">{training.modules.map((module, index) => <li key={`${training.id}-dialog-${index}`}><span>0{index + 1}</span><div><strong>{module}</strong><p>{['Сформулировать вопросы и ожидания от обучения.', 'Обсудить содержание с учебным подразделением.', 'Уточнить подходящий формат и дальнейшие шаги.'][index]}</p></div></li>)}</ol>
      <div className="callout vdpo-plan-note">Это пример структуры, а не действующая образовательная программа. Продолжительность, требования, документы и стоимость уточняются в ВДПО.</div>
      <div className="vdpo-dialog-actions"><button className="button primary" onClick={saveTrainingPlan}>Скачать пример плана <span aria-hidden="true">↓</span></button><ExternalLink href={OFFICIAL}>Уточнить в ВДПО</ExternalLink></div><p className="vdpo-download-status" role="status">{planDownloaded ? 'План подготовлен к скачиванию. Запись на обучение не выполнена.' : 'Вы можете сохранить план для подготовки к разговору.'}</p>
    </Dialog>}
  </div>;
}
