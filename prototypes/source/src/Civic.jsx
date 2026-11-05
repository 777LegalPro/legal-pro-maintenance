import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, ArrowRight, ChevronDown, TreePine, Route, Lightbulb, House, Map, GraduationCap, MessageSquare, Landmark, Users, CalendarDays, FileText, Wallet, Accessibility, Drama, Check, Clock } from 'lucide-react';
import { Dialog, EmptyState, ExternalLink, Pill } from './ui.jsx';
import './Civic.css';

const CITY = 'https://tyumen-city.ru/';
const CITY_STRUCTURE = `${CITY}vlast/administraciya-goroda-tyumeni/struktura-administracii-goroda-tyumeni`;
const CITY_APPEALS = `${CITY}vlast/obraschenie/`;
const CITY_CONTACTS = `${CITY}vlast/telefonnyy-spravochnik`;
const SERVICES = 'https://uslugi.admtyumen.ru/tyumen/portal/';
const DUMA = 'https://duma.tyumen-city.ru/';
const DUMA_ACTS = `${DUMA}deyatelnost/normativnye-pravovye-akty/`;
const DUMA_DEPUTIES = `${DUMA}deputies/`;
const DUMA_DISTRICTS = `${DUMA}obshchaya-informaciya/izbiratelnye-okruga/`;
const DUMA_RECEPTION = `${DUMA}deputies/grafik-priyoma-deputatov/`;
const DUMA_APPEALS = `${DUMA}obrashcheniya-grazhdan-i-organizaciy/internet-priemnaya/`;

const CIVIC_ICONS = {
  search: Search,
  arrow: ArrowRight,
  chevron: ChevronDown,
  tree: TreePine,
  road: Route,
  light: Lightbulb,
  home: House,
  map: Map,
  school: GraduationCap,
  message: MessageSquare,
  building: Landmark,
  people: Users,
  calendar: CalendarDays,
  document: FileText,
  budget: Wallet,
  access: Accessibility,
  culture: Drama,
  check: Check,
  clock: Clock,
};

function CivicIcon({ name = 'arrow', size = 22, className = '' }) {
  const Icon = CIVIC_ICONS[name] || ArrowRight;
  return <Icon size={size} className={className} strokeWidth={1.65} aria-hidden="true" focusable="false" />;
}

const normalized = value => value.toLocaleLowerCase('ru-RU').replaceAll('ё', 'е').trim();
const matches = (value, query) => normalized(query).split(/\s+/).filter(Boolean).every(word => normalized(value).includes(word));
const scrollToSection = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

const ADMIN_CATEGORIES = ['Все задачи', 'Двор и дороги', 'Жильё', 'Земля', 'Дети', 'Обратиться'];
const ADMIN_TASKS = [
  {
    id: 'yard', category: 'Двор и дороги', icon: 'tree', title: 'Сообщить о проблеме во дворе',
    description: 'Благоустройство, уборка и состояние общественного пространства.',
    keywords: 'двор двора мусор уборка площадка благоустройство территория',
    direction: 'Городское хозяйство и территория района',
    explanation: 'В этой концепции вопросы благоустройства объединены в одно направление. Конкретного адресата помогает уточнить официальный справочник.',
    preparation: ['Укажите адрес или ориентир.', 'Коротко опишите проблему и приложите фотографии, если они есть.'],
    nextStep: 'Откройте раздел обращений администрации и проверьте, какой способ подачи подходит для вашего вопроса.',
    href: CITY_APPEALS, action: 'Перейти к обращениям',
  },
  {
    id: 'road', category: 'Двор и дороги', icon: 'road', title: 'Сообщить о повреждении дороги',
    description: 'Дорога, тротуар, переход или другой элемент улицы.',
    keywords: 'дорога дороги яма тротуар переход асфальт ремонт улица',
    direction: 'Дороги и городская инфраструктура',
    explanation: 'Для примера вопрос направлен в тематическую группу дорожной инфраструктуры. При подаче потребуется уточнить принадлежность территории и адресата.',
    preparation: ['Отметьте точное место и ближайший адрес.', 'Опишите, что повреждено; добавьте фотографии, если они есть.'],
    nextStep: 'Перейдите в официальный раздел обращений. Сведения о ситуации внесите уже на официальном ресурсе.',
    href: CITY_APPEALS, action: 'Открыть официальный раздел',
  },
  {
    id: 'lighting', category: 'Двор и дороги', icon: 'light', title: 'Сообщить о неработающем освещении',
    description: 'Фонари на улице или в общественном пространстве.',
    keywords: 'свет освещение фонарь фонари темно улица',
    direction: 'Городское хозяйство и освещение',
    explanation: 'Тематический маршрут помогает начать поиск ответственного подразделения. Его компетенцию и контакты нужно проверить на сайте администрации.',
    preparation: ['Укажите улицу, ближайший дом или другой ориентир.', 'Опишите участок без освещения и время наблюдения.'],
    nextStep: 'Откройте телефонный справочник, чтобы уточнить ответственную службу и доступный способ связи.',
    href: CITY_CONTACTS, action: 'Открыть телефонный справочник',
  },
  {
    id: 'housing', category: 'Жильё', icon: 'home', title: 'Разобраться с вопросом по дому',
    description: 'Найти отправную точку для жилищного вопроса.',
    keywords: 'дом жилье квартира жкх управляющая компания вода отопление',
    direction: 'Жилищные вопросы',
    explanation: 'Сначала стоит уточнить, кто рассматривает вашу ситуацию. Тематическое направление в прототипе не определяет полномочия органа или организации.',
    preparation: ['Сформулируйте вопрос и укажите адрес дома.', 'Подготовьте сведения о предыдущих обращениях, если они были.'],
    nextStep: 'Проверьте контакты на официальном сайте и уточните адресата обращения.',
    href: CITY_CONTACTS, action: 'Найти официальные контакты',
  },
  {
    id: 'land', category: 'Земля', icon: 'map', title: 'Найти услугу по земельному участку',
    description: 'Выбрать нужную услугу и проверить ее условия.',
    keywords: 'земля земельный участок кадастр аренда собственность',
    direction: 'Земля и имущество',
    explanation: 'В концепции земельные вопросы собраны в одну группу. Название услуги, уполномоченный орган и условия получения указаны в официальной карточке услуги.',
    preparation: ['Определите, что вы хотите сделать с участком.', 'Держите под рукой адрес или кадастровый номер, если он известен.'],
    nextStep: 'Найдите подходящую услугу на региональном портале и ознакомьтесь с ее официальными условиями.',
    href: SERVICES, action: 'Открыть портал услуг',
  },
  {
    id: 'children', category: 'Дети', icon: 'school', title: 'Найти услугу записи в детский сад',
    description: 'Перейти к официальной информации и подаче заявления.',
    keywords: 'дети ребенок детский сад садик образование дошкольное очередь',
    direction: 'Дети и образование',
    explanation: 'Это пример маршрута к образовательной услуге. Актуальные условия, документы и способы подачи проверяйте в официальной карточке.',
    preparation: ['Найдите на портале услугу, соответствующую вашей ситуации.', 'Перед подачей проверьте сведения о заявителе и перечень документов.'],
    nextStep: 'Перейдите на региональный портал услуг и выполните поиск по теме «детский сад».',
    href: SERVICES, action: 'Найти услугу на портале',
  },
  {
    id: 'appeal', category: 'Обратиться', icon: 'message', title: 'Направить обращение в город',
    description: 'Предложение, вопрос или описание вашей ситуации.',
    keywords: 'обращение жалоба предложение вопрос написать письмо приемная',
    direction: 'Работа с обращениями',
    explanation: 'Этот маршрут ведет к официальной информации о подаче обращений в администрацию города.',
    preparation: ['Сформулируйте суть вопроса и желаемый результат.', 'Подготовьте относящиеся к вопросу материалы, если они есть.'],
    nextStep: 'Ознакомьтесь с правилами и способами подачи в официальном разделе обращений.',
    href: CITY_APPEALS, action: 'Перейти к подаче обращения',
  },
  {
    id: 'contacts', category: 'Обратиться', icon: 'people', title: 'Найти нужный контакт',
    description: 'Проверить подразделение и способ связи с ним.',
    keywords: 'контакт контакты телефон справочник подразделение администрация структура',
    direction: 'Справочная информация',
    explanation: 'Для поиска актуальных названий подразделений и контактов используйте официальный справочник администрации.',
    preparation: ['Определите тему вопроса.', 'Найдите соответствующее подразделение в официальном справочнике.'],
    nextStep: 'Откройте телефонный справочник администрации города.',
    href: CITY_CONTACTS, action: 'Открыть справочник',
  },
];

const DIRECTIONS = [
  { id: 'environment', title: 'Городская среда', subtitle: 'Дворы, дороги и повседневная жизнь города', icon: 'tree',
    items: [
      { title: 'Дворы и благоустройство', description: 'Общественные пространства, уборка и освещение.', keywords: 'двор мусор фонарь свет площадка', category: 'Двор и дороги' },
      { title: 'Дороги и инфраструктура', description: 'Улицы, тротуары и элементы дорожной среды.', keywords: 'дорога ремонт яма переход асфальт транспорт', category: 'Двор и дороги' },
    ],
  },
  { id: 'territory', title: 'Дом и территория', subtitle: 'Жилищные вопросы, земля и имущество', icon: 'home',
    items: [
      { title: 'Жилищные вопросы', description: 'Поиск адресата для вопроса о доме и жилищных услугах.', keywords: 'дом квартира жкх отопление вода управляющая компания', category: 'Жильё' },
      { title: 'Земля и городское планирование', description: 'Участки, имущество и поиск подходящей услуги.', keywords: 'земля участок кадастр аренда адрес строительство', category: 'Земля' },
    ],
  },
  { id: 'people', title: 'Дети и городская жизнь', subtitle: 'Образование, культура, спорт и молодежь', icon: 'school',
    items: [
      { title: 'Дети и образование', description: 'Дошкольные услуги и вопросы образования.', keywords: 'дети ребенок детский сад садик школа очередь', category: 'Дети' },
      { title: 'Культура, спорт и молодежь', description: 'Поиск профильного направления в официальной структуре.', keywords: 'культура спорт секция кружок молодежь', href: CITY_STRUCTURE, linkLabel: 'Проверить официальную структуру' },
    ],
  },
  { id: 'dialogue', title: 'Диалог с городом', subtitle: 'Обращения, предложения и официальные контакты', icon: 'message',
    items: [
      { title: 'Обращения жителей', description: 'Куда направить вопрос, предложение или описание ситуации.', keywords: 'обращение жалоба письмо вопрос приемная', category: 'Обратиться' },
      { title: 'Подразделения и контакты', description: 'Официальный телефонный справочник администрации.', keywords: 'контакт телефон адрес руководитель справочник', href: CITY_CONTACTS, linkLabel: 'Открыть справочник' },
    ],
  },
];

function HeroSearch({ id, value, onChange, onSubmit, placeholder, suggestions }) {
  return <div className="civic-search-wrap">
    <form className="civic-hero-search" role="search" onSubmit={event => { event.preventDefault(); onSubmit(); }}>
      <CivicIcon name="search" size={23} />
      <label className="sr-only" htmlFor={id}>{placeholder}</label>
      <input id={id} type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} autoComplete="off" />
      <button className="button primary" type="submit">Найти <CivicIcon size={18} /></button>
    </form>
    <div className="civic-suggestions"><span>Например:</span>{suggestions.map(word => <button key={word} type="button" onClick={() => { onChange(word); onSubmit(); }}>{word}</button>)}</div>
  </div>;
}

function AdminTaskDialog({ task, onClose }) {
  return <Dialog title={task.title} label="Маршрут решения вопроса" onClose={onClose}>
    <div className="civic-dialog-tags"><Pill>{task.category}</Pill><Pill tone="blue">Концепция маршрута</Pill></div>
    <div className="civic-route-direction"><span className="civic-icon-tile"><CivicIcon name={task.icon} /></span><div><span className="civic-meta-label">Направление для поиска адресата</span><h3>{task.direction}</h3></div></div>
    <p className="civic-dialog-copy">{task.explanation}</p>
    <div className="civic-dialog-section"><h3>Что подготовить</h3><ul className="civic-check-list">{task.preparation.map(item => <li key={item}><CivicIcon name="check" size={17} /><span>{item}</span></li>)}</ul></div>
    <div className="civic-next-step"><span className="civic-step-number">01</span><div><h3>Следующий шаг</h3><p>{task.nextStep}</p></div></div>
    <ExternalLink href={task.href} className="button primary civic-dialog-primary">{task.action}</ExternalLink>
    <p className="source-note civic-dialog-note">Маршрут не подтверждает компетенцию подразделения и не гарантирует результат. Актуальный порядок и адресата проверяйте на официальном сайте.</p>
    <button type="button" className="button quiet civic-dialog-back" onClick={onClose}>Вернуться к задачам</button>
  </Dialog>;
}

export function Administration() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Все задачи');
  const [selectedTask, setSelectedTask] = useState(null);
  const [structureQuery, setStructureQuery] = useState('');
  const [expandedDirections, setExpandedDirections] = useState(['environment']);

  const tasks = useMemo(() => ADMIN_TASKS.filter(task => (category === 'Все задачи' || task.category === category) && matches(`${task.title} ${task.description} ${task.keywords} ${task.category}`, query)), [query, category]);
  const directions = useMemo(() => DIRECTIONS.map(group => ({ ...group, items: group.items.filter(item => matches(`${group.title} ${group.subtitle} ${item.title} ${item.description} ${item.keywords}`, structureQuery)) })).filter(group => group.items.length), [structureQuery]);
  const allExpanded = directions.length > 0 && directions.every(group => expandedDirections.includes(group.id));

  function searchDirections(value) {
    setStructureQuery(value);
    setExpandedDirections(value.trim() ? DIRECTIONS.map(group => group.id) : ['environment']);
  }
  function showCategory(value) {
    setQuery('');
    setCategory(value);
    scrollToSection('civic-admin-tasks');
  }
  function resetTasks() { setQuery(''); setCategory('Все задачи'); }

  return <div className="civic-page civic-admin">
    <section className="page-hero civic-hero" aria-labelledby="civic-admin-title">
      <div className="hero-copy civic-hero-copy">
        <p className="eyebrow civic-hero-eyebrow"><span className="civic-eyebrow-line" />Тюмень · городские задачи</p>
        <h1 id="civic-admin-title">Город, в котором легко решить вопрос</h1>
        <p className="hero-lead">Начните со своей задачи. Найдите нужное направление и следующий шаг.</p>
        <HeroSearch id="civic-admin-search" value={query} onChange={setQuery} onSubmit={() => scrollToSection('civic-admin-tasks')} placeholder="Какой вопрос нужно решить?" suggestions={['двор', 'детский сад', 'обращение']} />
        <button className="civic-inline-action" type="button" onClick={() => scrollToSection('civic-admin-structure')}>Найти направление в администрации <CivicIcon size={17} /></button>
      </div>
      <aside className="hero-panel civic-hero-panel civic-admin-hero-panel" aria-label="Быстрые маршруты">
        <div className="civic-hero-panel-heading"><span className="civic-panel-mark"><CivicIcon name="building" size={25} /></span><span>Город начинается<br />с вашего вопроса</span></div>
        <div><p className="civic-panel-overline">Быстрый маршрут</p><h2>С чего начнём?</h2></div>
        <div className="civic-quick-routes">
          {[ADMIN_TASKS[0], ADMIN_TASKS[5], ADMIN_TASKS[6]].map(task => <button type="button" key={task.id} onClick={() => setSelectedTask(task)}><CivicIcon name={task.icon} /><span>{task.id === 'yard' ? 'Порядок во дворе' : task.id === 'children' ? 'Детский сад' : 'Обращение в город'}</span><CivicIcon name="arrow" size={18} /></button>)}
        </div>
        <p className="civic-panel-footnote"><span />Понятная задача. Понятный следующий шаг.</p>
      </aside>
    </section>

    <section className="section civic-section" id="civic-admin-tasks" aria-labelledby="civic-admin-tasks-heading">
      <div className="civic-heading-row"><div><p className="eyebrow">Ваш вопрос — отправная точка</p><h2 id="civic-admin-tasks-heading">Что нужно сделать?</h2></div><span className="civic-result-count" aria-live="polite">Найдено задач: <strong>{tasks.length}</strong></span></div>
      <div className="filter-bar civic-filters" role="group" aria-label="Категории городских задач">{ADMIN_CATEGORIES.map(item => <button key={item} type="button" className={`chip${category === item ? ' active' : ''}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</div>
      {query.trim() && <div className="civic-search-context"><span>Поиск: «{query.trim()}»</span><button type="button" onClick={() => setQuery('')}>Очистить поиск <span aria-hidden="true">×</span></button></div>}
      {tasks.length ? <div className="card-grid civic-task-grid">{tasks.map(task => <button type="button" className="task-card civic-task-card" key={task.id} onClick={() => setSelectedTask(task)} aria-haspopup="dialog">
        <div className="civic-card-top"><span className="civic-icon-tile"><CivicIcon name={task.icon} /></span><span className="civic-card-category">{task.category}</span></div>
        <h3>{task.title}</h3><p>{task.description}</p><span className="civic-card-action">Посмотреть маршрут <CivicIcon size={18} /></span>
      </button>)}</div> : <EmptyState title="Такую задачу пока не нашли" onReset={resetTasks}>Попробуйте короткий запрос, например «двор» или «детский сад», либо выберите другую категорию.</EmptyState>}
      <div className="civic-help-strip"><div><CivicIcon name="message" /><span>Нужен другой вопрос? Начните с официальной приемной.</span></div><ExternalLink href={CITY_APPEALS}>Обращения в администрацию</ExternalLink></div>
    </section>

    <section className="section civic-section" id="civic-admin-structure" aria-labelledby="civic-structure-heading">
      <div className="civic-heading-row civic-structure-heading"><div><p className="eyebrow">Карта направлений</p><h2 id="civic-structure-heading">Кто занимается вашим вопросом</h2><p className="section-description">Раскройте тему и найдите отправную точку для обращения.</p></div><Pill tone="blue">Тематическая схема</Pill></div>
      <p className="civic-structure-disclaimer">Это концепция навигации по темам. Названия ниже не являются официальной организационной структурой администрации.</p>
      <div className="civic-structure-toolbar"><label className="civic-structure-search" htmlFor="civic-structure-search"><CivicIcon name="search" size={20} /><span className="sr-only">Поиск по направлениям</span><input id="civic-structure-search" type="search" value={structureQuery} onChange={event => searchDirections(event.target.value)} placeholder="Например, дороги или образование" /></label><button type="button" className="button quiet small" disabled={!directions.length} onClick={() => setExpandedDirections(allExpanded ? [] : directions.map(group => group.id))}>{allExpanded ? 'Свернуть все' : 'Развернуть все'}</button></div>
      <div className="civic-directions" aria-live="polite">{directions.length ? directions.map(group => {
        const expanded = expandedDirections.includes(group.id);
        return <article className={`civic-direction${expanded ? ' is-expanded' : ''}`} key={group.id}>
          <h3><button className="civic-direction-toggle" type="button" aria-expanded={expanded} aria-controls={`civic-direction-${group.id}`} onClick={() => setExpandedDirections(current => current.includes(group.id) ? current.filter(id => id !== group.id) : [...current, group.id])}>
            <span className="civic-direction-icon"><CivicIcon name={group.icon} /></span><span className="civic-direction-title"><strong>{group.title}</strong><span>{group.subtitle}</span></span><span className="civic-direction-count">{group.items.length} {group.items.length === 1 ? 'тема' : 'темы'}</span><CivicIcon name="chevron" className="civic-chevron" size={20} />
          </button></h3>
          {expanded && <div id={`civic-direction-${group.id}`} className="civic-direction-grid">{group.items.map(item => <div className="civic-direction-card" key={item.title}><h4>{item.title}</h4><p>{item.description}</p>{item.category ? <button type="button" className="civic-inline-action" onClick={() => showCategory(item.category)}>Посмотреть задачи <CivicIcon size={17} /></button> : <ExternalLink href={item.href}>{item.linkLabel}</ExternalLink>}</div>)}</div>}
        </article>;
      }) : <EmptyState title="Направление не найдено" onReset={() => searchDirections('')}>Попробуйте искать по теме вопроса: «жильё», «детский сад», «контакты».</EmptyState>}</div>
      <div className="civic-structure-links"><ExternalLink href={CITY_STRUCTURE}>Официальная структура администрации</ExternalLink><ExternalLink href={CITY_CONTACTS}>Телефонный справочник</ExternalLink></div>
    </section>

    <aside className="civic-source-box" aria-labelledby="civic-admin-sources"><div><p className="eyebrow">Источники и границы концепции</p><h2 id="civic-admin-sources">Дальше — на официальном сайте</h2><p>Задачи и тематическая карта подготовлены для демонстрации интерфейса. Полномочия подразделений, условия услуг и способы подачи проверяйте в первоисточниках.</p></div><div className="civic-source-links"><ExternalLink href={CITY}>Администрация Тюмени</ExternalLink><ExternalLink href={CITY_STRUCTURE}>Структура администрации</ExternalLink><ExternalLink href={CITY_CONTACTS}>Официальные контакты</ExternalLink><ExternalLink href={SERVICES}>Портал услуг Тюменской области</ExternalLink></div></aside>
    {selectedTask && <AdminTaskDialog task={selectedTask} onClose={() => setSelectedTask(null)} />}
  </div>;
}

const DUMA_TOPICS = ['Все темы', 'Городская среда', 'Бюджет', 'Социальные вопросы', 'Участие'];
const DUMA_RECORDS = [
  {
    id: 'courtyards', topic: 'Городская среда', icon: 'tree', title: 'Благоустройство дворов',
    summary: 'Как может быть устроен выбор территорий и участие жителей.', keywords: 'двор дворы благоустройство территория ремонт площадка',
    essence: 'Представим решение, по которому жители предлагают дворы для благоустройства, а выбранные территории публикуются вместе с основаниями выбора. Это условная ситуация для учебного примера.',
    changes: ['Жители могли бы предложить свой двор для рассмотрения.', 'Предложения сравнивались бы по заранее опубликованным критериям.', 'Перечень выбранных дворов был бы доступен вместе с описанием работ.'],
    check: 'В реальном акте проверьте адрес, приложения, дату вступления в силу и последующие изменения.',
  },
  {
    id: 'budget', topic: 'Бюджет', icon: 'budget', title: 'Городской бюджет',
    summary: 'Как направления расходов связаны с повседневной жизнью города.', keywords: 'бюджет деньги расходы доходы финансирование',
    essence: 'В условном бюджетном решении выделены расходы на городскую среду, образование и социальные объекты. Пример помогает увидеть связь между приоритетами города и планируемыми расходами.',
    changes: ['Для выбранных направлений предусматривалось бы отдельное финансирование.', 'Изменение приоритетов отражалось бы в распределении расходов.', 'Планируемые расходы можно было бы сопоставить с последующими отчетами об исполнении.'],
    check: 'В реальном документе проверьте финансовый период, единицы измерения и редакцию. В этом примере нет настоящих бюджетных сумм.',
  },
  {
    id: 'accessibility', topic: 'Социальные вопросы', icon: 'access', title: 'Доступная городская среда',
    summary: 'На что обращать внимание в документах о доступности объектов.', keywords: 'доступность доступная среда инвалидность пандус социальные объекты',
    essence: 'Представим документ, который включает выбранные городские объекты в план работ по доступности. Учебная ситуация касается входов, маршрутов внутри зданий и понятной навигации.',
    changes: ['Входы и основные маршруты на выбранных объектах адаптировались бы для разных посетителей.', 'На объектах появлялись бы более понятные указатели.', 'Сведения о предусмотренных работах можно было бы проверить по перечню объектов.'],
    check: 'Найдите в официальном акте нужный объект и его характеристики. Демонстрационный пример не устанавливает требования или обязательства.',
  },
  {
    id: 'discussion', topic: 'Участие', icon: 'message', title: 'Обсуждение городских проектов',
    summary: 'Как найти предмет обсуждения и способ участия.', keywords: 'участие обсуждение слушания предложение проект жители',
    essence: 'В учебной ситуации городской проект публикуется с материалами, после чего жители могут направить предложения. По итогам обсуждения становится доступна информация о рассмотренных замечаниях.',
    changes: ['Жители могли бы заранее ознакомиться с материалами проекта.', 'Предложения направлялись бы указанным в официальном объявлении способом.', 'После обсуждения можно было бы проверить его опубликованные результаты.'],
    check: 'В реальном объявлении проверьте предмет, территорию, порядок и период участия. Здесь не анонсируется настоящее обсуждение.',
  },
  {
    id: 'signs', topic: 'Городская среда', icon: 'building', title: 'Вывески и облик улиц',
    summary: 'Как читать правила, затрагивающие городскую среду и бизнес.', keywords: 'вывеска вывески улица фасад бизнес правила благоустройство',
    essence: 'Условный документ описывает общий подход к размещению вывесок на фасадах. В примере различаются типы объектов и объясняется, какие сведения нужно проверить до установки.',
    changes: ['Владельцы вывесок ориентировались бы на общий набор условий.', 'Для разных типов фасадов могли бы предусматриваться отдельные требования.', 'Перед размещением вывески потребовалось бы проверить применимые условия и исключения.'],
    check: 'Применимость правил, исключения и процедуру согласования проверяйте по действующему официальному документу.',
  },
  {
    id: 'initiatives', topic: 'Участие', icon: 'people', title: 'Инициативы жителей',
    summary: 'Как разобраться в порядке рассмотрения предложений.', keywords: 'инициатива инициативы предложение участие жители район',
    essence: 'Представим порядок, по которому жители предлагают улучшения для своего района. В учебном примере идея проходит подачу, рассмотрение и публикацию результата.',
    changes: ['Жители могли бы описать проблему и предложить конкретное улучшение.', 'Предложения рассматривались бы по опубликованным условиям.', 'Результат рассмотрения можно было бы найти вместе с информацией об инициативе.'],
    check: 'Проверьте, предусмотрена ли подходящая процедура действующими актами. Учебный пример сам по себе такой процедуры не создает.',
  },
];

function DecisionDialog({ record, onClose }) {
  return <Dialog title={record.title} label="Решение понятным языком" onClose={onClose}>
    <div className="civic-dialog-tags"><Pill>{record.topic}</Pill><Pill tone="amber">DEMO · учебный пример</Pill></div>
    <div className="civic-dialog-section"><h3>Краткая суть</h3><p>{record.essence}</p></div>
    <div className="civic-dialog-section"><h3>Что изменилось бы в этом примере</h3><ul className="civic-check-list">{record.changes.map(item => <li key={item}><CivicIcon name="check" size={18} /><span>{item}</span></li>)}</ul></div>
    <div className="civic-reading-note"><CivicIcon name="document" size={22} /><div><h3>Что проверить в настоящем документе</h3><p>{record.check}</p></div></div>
    <div className="civic-dialog-section"><h3>Оригинал и официальный источник</h3><p>У этого учебного примера нет официального оригинала, номера и даты. Настоящие решения опубликованы в разделе нормативных правовых актов Думы.</p></div>
    <ExternalLink href={DUMA_ACTS} className="button primary civic-dialog-primary">Открыть официальные акты</ExternalLink>
    <p className="source-note civic-dialog-note">В примере описана условная ситуация. Для решения реального вопроса используйте действующий официальный акт.</p>
  </Dialog>;
}

function DemoAppointment() {
  const [topic, setTopic] = useState('');
  const [slot, setSlot] = useState('');
  const [step, setStep] = useState('form');
  const stageRef = useRef(null);
  const topicRef = useRef(null);
  const previousStep = useRef('form');
  useEffect(() => {
    if (previousStep.current !== step) {
      if (step === 'form') topicRef.current?.focus();
      else stageRef.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  function reset() { setTopic(''); setSlot(''); setStep('form'); }

  return <section id="civic-appointment" className="panel civic-appointment" aria-labelledby="civic-appointment-heading">
    <div className="civic-small-panel-top"><span className="civic-icon-tile"><CivicIcon name="calendar" /></span><Pill tone="amber">Учебный сценарий</Pill></div>
    <h2 id="civic-appointment-heading">Запись на приём</h2>
    {step === 'form' ? <>
      <p className="civic-panel-description">Попробуйте выбрать тему и время. Личные данные здесь не нужны.</p>
      <form className="civic-booking-form" onSubmit={event => { event.preventDefault(); setStep('review'); }}>
        <label className="field civic-topic-field" htmlFor="civic-appointment-topic"><span>Тема приёма</span><select id="civic-appointment-topic" ref={topicRef} required value={topic} onChange={event => setTopic(event.target.value)}><option value="" disabled>Выберите тему</option>{['Двор и благоустройство', 'Городской бюджет', 'Социальный вопрос', 'Предложение по развитию города', 'Другой вопрос'].map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <fieldset className="civic-slots-fieldset"><legend>Учебный интервал</legend><div className="civic-slots">{['10:00', '11:30', '15:00'].map(time => <label className={`civic-slot${slot === time ? ' is-selected' : ''}`} key={time}><input type="radio" required name="civic-appointment-slot" value={time} checked={slot === time} onChange={() => setSlot(time)} /><CivicIcon name="clock" size={17} /><span>{time}</span></label>)}</div><p className="civic-field-hint">Условный день. Время не связано с расписанием депутатов.</p></fieldset>
        <button type="submit" className="button primary civic-booking-button">Проверить выбор <CivicIcon size={18} /></button>
        <p className="civic-booking-disclaimer">Действия в этом блоке не создают запись и не направляют заявку.</p>
      </form>
    </> : step === 'review' ? <div className="civic-booking-stage" ref={stageRef} tabIndex={-1}>
      <p className="civic-panel-description">Проверьте выбор перед завершением учебного сценария.</p>
      <dl className="civic-booking-summary"><div><dt>Тема</dt><dd>{topic}</dd></div><div><dt>Учебный интервал</dt><dd>{slot}<span> · условный день</span></dd></div></dl>
      <p className="civic-demo-callout">Это демонстрация. Реальный приём не назначается.</p>
      <button type="button" className="button primary civic-booking-button" onClick={() => setStep('confirmed')}>Подтвердить учебный сценарий</button>
      <button type="button" className="button quiet civic-booking-button" onClick={() => setStep('form')}>Изменить выбор</button>
    </div> : <div className="civic-booking-stage civic-booking-complete" ref={stageRef} tabIndex={-1} role="status">
      <span className="civic-success-mark"><CivicIcon name="check" size={29} /></span><h3>Учебный сценарий завершён</h3><p>Вы выбрали тему «{topic}» и условный интервал {slot}. Это не запись на реальный приём.</p>
      <ExternalLink href={DUMA_RECEPTION} className="button primary civic-booking-button">Проверить настоящий график</ExternalLink>
      <button type="button" className="button quiet civic-booking-button" onClick={reset}>Пройти сценарий ещё раз</button>
    </div>}
  </section>;
}

export function Duma() {
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState('Все темы');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const records = useMemo(() => DUMA_RECORDS.filter(record => (topic === 'Все темы' || record.topic === topic) && matches(`${record.title} ${record.summary} ${record.topic} ${record.keywords}`, query)), [query, topic]);

  function resetRecords() { setQuery(''); setTopic('Все темы'); }

  return <div className="civic-page civic-duma">
    <section className="page-hero civic-hero" aria-labelledby="civic-duma-title">
      <div className="hero-copy civic-hero-copy">
        <p className="eyebrow civic-hero-eyebrow"><span className="civic-eyebrow-line" />Тюмень · городская Дума</p>
        <h1 id="civic-duma-title">Решения города — понятным языком</h1>
        <p className="hero-lead">Разберитесь в теме, найдите официальный документ и узнайте, как связаться со своим депутатом.</p>
        <HeroSearch id="civic-duma-search" value={query} onChange={setQuery} onSubmit={() => scrollToSection('civic-duma-decisions')} placeholder="Какая тема вас интересует?" suggestions={['бюджет', 'двор', 'обсуждение']} />
        <button className="civic-inline-action" type="button" onClick={() => scrollToSection('civic-my-deputy')}>Мой депутат и приём жителей <CivicIcon size={17} /></button>
      </div>
      <aside className="hero-panel civic-hero-panel civic-duma-hero-panel" aria-label="Пример понятной карточки решения">
        <div className="civic-hero-panel-heading"><span className="civic-panel-mark"><CivicIcon name="document" size={25} /></span><span>Понятная суть.<br />Проверяемый источник.</span></div>
        <div><p className="civic-panel-overline">Учебный пример</p><h2>Благоустройство<br />дворов</h2></div>
        <p className="civic-featured-description">Что может измениться, кого касается документ и где проверить подробности.</p>
        <div className="civic-featured-flow"><span><span>01</span>Суть</span><span><span>02</span>Изменения</span><span><span>03</span>Источник</span></div>
        <button type="button" className="civic-featured-button" onClick={() => setSelectedRecord(DUMA_RECORDS[0])} aria-haspopup="dialog">Открыть учебный пример <CivicIcon size={19} /></button>
        <p className="civic-panel-footnote"><span />Демонстрационные данные, не принятый акт</p>
      </aside>
    </section>

    <section className="section civic-section" id="civic-duma-decisions" aria-labelledby="civic-decisions-heading">
      <div className="civic-heading-row"><div><p className="eyebrow">Разобраться в решении</p><h2 id="civic-decisions-heading">Городские темы</h2></div><span className="civic-result-count" aria-live="polite">Учебных примеров: <strong>{records.length}</strong></span></div>
      <div className="civic-demo-line"><Pill tone="amber">DEMO</Pill><span>Все карточки — учебные примеры. Они не описывают конкретные принятые акты.</span></div>
      <div className="filter-bar civic-filters" role="group" aria-label="Темы учебных решений">{DUMA_TOPICS.map(item => <button type="button" key={item} className={`chip${topic === item ? ' active' : ''}`} aria-pressed={topic === item} onClick={() => setTopic(item)}>{item}</button>)}</div>
      {query.trim() && <div className="civic-search-context"><span>Поиск: «{query.trim()}»</span><button type="button" onClick={() => setQuery('')}>Очистить поиск <span aria-hidden="true">×</span></button></div>}
      {records.length ? <div className="card-grid civic-task-grid">{records.map(record => <button type="button" className="task-card civic-task-card civic-decision-card" key={record.id} onClick={() => setSelectedRecord(record)} aria-haspopup="dialog">
        <div className="civic-card-top"><span className="civic-icon-tile"><CivicIcon name={record.icon} /></span><span className="civic-card-category">{record.topic}</span></div>
        <h3>{record.title}</h3><p>{record.summary}</p><div className="civic-decision-bottom"><span className="civic-demo-label">Учебный пример</span><span className="civic-card-arrow"><CivicIcon size={20} /></span></div>
      </button>)}</div> : <EmptyState title="По этой теме примеров пока нет" onReset={resetRecords}>Попробуйте другой запрос или откройте все темы. Настоящие документы доступны в официальном разделе Думы.</EmptyState>}
      <div className="civic-help-strip"><div><CivicIcon name="document" /><span>Ищете конкретное решение или его действующую редакцию?</span></div><ExternalLink href={DUMA_ACTS}>Официальные нормативные акты</ExternalLink></div>
    </section>

    <div className="section split-section civic-contact-grid" id="civic-my-deputy">
      <section className="panel civic-deputy-panel" aria-labelledby="civic-deputy-heading">
        <div className="civic-small-panel-top"><span className="civic-icon-tile"><CivicIcon name="people" /></span><span className="civic-official-marker"><span />Официальные ресурсы</span></div>
        <h2 id="civic-deputy-heading">Мой депутат</h2><p className="civic-panel-description">Найдите свой округ, откройте список депутатов и проверьте время приёма.</p>
        <div className="civic-deputy-links">
          <ExternalLink href={DUMA_DISTRICTS} className="civic-deputy-link"><span className="civic-deputy-link-number">01</span><span><strong>Найти избирательный округ</strong><span>Официальная информация об округах</span></span></ExternalLink>
          <ExternalLink href={DUMA_DEPUTIES} className="civic-deputy-link"><span className="civic-deputy-link-number">02</span><span><strong>Открыть список депутатов</strong><span>Проверить представителя своего округа</span></span></ExternalLink>
          <ExternalLink href={DUMA_RECEPTION} className="civic-deputy-link"><span className="civic-deputy-link-number">03</span><span><strong>Посмотреть график приёма</strong><span>Уточнить актуальные время и порядок</span></span></ExternalLink>
        </div>
        <div className="civic-deputy-bottom"><CivicIcon name="message" size={20} /><div><p>Хотите обратиться письменно?</p><ExternalLink href={DUMA_APPEALS}>Интернет-приёмная Думы</ExternalLink></div></div>
      </section>
      <DemoAppointment />
    </div>

    <aside className="civic-source-box" aria-labelledby="civic-duma-sources"><div><p className="eyebrow">Источники и учебные данные</p><h2 id="civic-duma-sources">Суть должна вести к первоисточнику</h2><p>Карточки показывают условные ситуации, а интервалы приёма выбраны для учебного сценария. Документы, сведения о депутатах и настоящий график доступны на официальном сайте.</p></div><div className="civic-source-links"><ExternalLink href={DUMA}>Тюменская городская Дума</ExternalLink><ExternalLink href={DUMA_ACTS}>Нормативные правовые акты</ExternalLink><ExternalLink href={DUMA_DEPUTIES}>Официальный список депутатов</ExternalLink><ExternalLink href={DUMA_APPEALS}>Интернет-приёмная</ExternalLink></div></aside>
    {selectedRecord && <DecisionDialog record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
  </div>;
}
