import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft, ArrowRight, BadgeCheck, Banknote, CarFront, Check,
  CircleHelp, Clock3, CreditCard, FileCheck2, FileText, Gauge, Gavel, LockKeyhole,
  Menu, Moon, Search, ShieldCheck, Sparkles, Sun, UploadCloud, X,
} from "lucide-react";
import { loadInfractions, type Infraction } from "../data/infractions";

export const Route = createFileRoute("/")({ component: MultasAI });

const reasons = [
  "O motorista/condutor não se achava no local citado",
  "O antigo dono ainda era o responsável legal pelo automóvel na data do auto de infração",
  "A notificação extrapolou o limite máximo de 30 dias para envio",
  "O auto de infração contém dados divergentes ou inconsistentes",
  "Falta do comprovante oficial de entrega (AR) na remessa da notificação",
  "A autuação decorre do uso indevido da placa por outro veículo idêntico",
  "Sinalização viária inexistente, insuficiente ou em desacordo com as normas do CONTRAN",
  "Equipamento de medição/fiscalização (radar, etilômetro) sem verificação metrológica válida pelo INMETRO",
];
const speedInfractionReasons = [
  "Deficiência ou falta de clareza nas placas de trânsito, comprometendo a perfeita compreensão por parte do condutor",
  "Obstrução da sinalização vertical por vegetação, impedindo a prévia e adequada visualização do limite fixado",
  "Posicionamento do equipamento medidor a uma distância extremamente reduzida da placa regulamentar, inviabilizando a adaptação gradual e segura da velocidade",
  "Variação abrupta e sucessiva dos limites regulamentares em um pequeno trecho da via, contrariando a previsibilidade do tráfego",
  "Inadequação, inconsistência ou escassez de placas regulamentares ao longo da via",
  "Presença de arborização na via que compromete a visibilidade das placas orientativas e regulamentares",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "Inexistência de sinalização regulamentar necessária para informar o condutor sobre o limite vigente no local",
  "Situação de grave ameaça e risco iminente à integridade física decorrente de conduta criminosa de terceiros na via",
  "Elevado índice de vulnerabilidade e insegurança da região, justificando a não imobilização ou a alteração do fluxo normal do veículo",
  "Inconsistência, erro material ou omissão de elementos essenciais no Auto de Infração de Trânsito (AIT)",
  "Estado de necessidade decorrente de emergência médica ou urgência de saúde que justificou a conduta do condutor",
];
const states = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];
const severityByPrefix: Record<string, string> = {
  "501":"gravíssima","502":"gravíssima","503":"gravíssima","504":"gravíssima","505":"gravíssima","506":"gravíssima","507":"gravíssima","508":"gravíssima","509":"gravíssima","510":"gravíssima","511":"gravíssima","512":"gravíssima","513":"gravíssima","514":"gravíssima","515":"gravíssima","516":"gravíssima","517":"gravíssima","524":"gravíssima",
  "518":"grave","545":"grave","554":"grave","555":"grave","556":"grave","604":"grave",
  "560":"média","562":"média","566":"média","567":"média","574":"média","686":"média",
  "605":"gravíssima","659":"gravíssima","701":"gravíssima","703":"gravíssima","704":"gravíssima","705":"gravíssima","706":"gravíssima","707":"gravíssima","758":"gravíssima","763":"gravíssima",
  "651":"leve","736":"média","745":"média","746":"grave","747":"gravíssima",
};
// Enquadramentos verificados individualmente prevalecem sobre a regra geral do prefixo.
// 500-20 é uma penalidade por não identificação do condutor; sem o enquadramento original,
// o catálogo não informa a gravidade da infração que gerou a multa. Para o preço do serviço,
// usa-se a faixa padrão intermediária até haver essa informação.
const severityByCode: Record<string, string> = {
  "500-20":"leve",
  "604-11":"grave","604-12":"grave",
  "605-01":"gravíssima","605-02":"gravíssima","605-03":"gravíssima",
  "545-22":"grave","545-23":"grave","545-27":"grave",
  "554-11":"grave","554-12":"grave","554-13":"grave","554-14":"grave","554-15":"gravíssima","554-16":"gravíssima","554-17":"grave",
  "555-00":"média","556-80":"grave",
  "560-60":"média","562-22":"média","566-50":"média","567-31":"média","567-32":"média",
  "574-61":"média","574-62":"média","574-63":"média",
  "651-30":"leve","659-92":"gravíssima","686-61":"gravíssima","686-62":"gravíssima",
  "701-31":"gravíssima","758-70":"gravíssima",
  "518-51":"grave","518-52":"grave","736-62":"média","763-3":"gravíssima",
  "745-50":"média","746-30":"grave","747-10":"gravíssima",
};
const severityPrice: Record<string, number> = { leve:14.99, média:19.99, grave:24.99, gravíssima:39.99 };
const money = (n:number) => n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const fieldClass = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
const Field = ({label,children,required=false,dark=false}:{label:string;children:ReactNode;required?:boolean;dark?:boolean}) => <div><label className={dark ? "mb-1.5 block text-sm font-medium text-slate-200" : labelClass}>{label}{required&&<span className="text-rose-500"> *</span>}</label>{children}</div>;

const normalizeInfractionSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");

export function MultasAI() {
  const [infractions, setInfractions] = useState<Infraction[]>([]);
  const [step, setStep] = useState(1);
  const [admin, setAdmin] = useState(false);
  const [dark, setDark] = useState(false);
  const [search, setSearch] = useState("");
  const [infractionCode, setInfractionCode] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [uf, setUf] = useState("SP");
  const [city, setCity] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [authority, setAuthority] = useState("");
  const [otherAuthority, setOtherAuthority] = useState("");
  const [cepLookupStatus, setCepLookupStatus] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedTruth, setConfirmedTruth] = useState(false);
  const [legalView, setLegalView] = useState<"privacy" | "terms" | null>(null);
  const [reason, setReason] = useState("");
  const [story, setStory] = useState("");
  const [frontFile, setFrontFile] = useState("");
  const [backFile, setBackFile] = useState("");
  const [plan, setPlan] = useState<"avulso"|"anual">("avulso");
  const [payment, setPayment] = useState<"pix"|"card">("pix");
  const [installments, setInstallments] = useState(1);
  const [coupon, setCoupon] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [email, setEmail] = useState("");
  const [person, setPerson] = useState({name:"",cpf:"",rg:"",cnh:"",street:"",number:"",district:"",cep:"",personCity:"",personState:"SP"});
  const [vehicleType, setVehicleType] = useState("Carro");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [customModel, setCustomModel] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [renavam, setRenavam] = useState("");
  const [card, setCard] = useState({name:"",number:"",expiry:"",cvv:""});
  const [notice, setNotice] = useState("");
  const [drafts, setDrafts] = useState<Array<{id:string;infraction:string;person:string;status:string;price:number;reason:string;email:string}>>([]);
  const [adminFilter, setAdminFilter] = useState("Todos");
  const selected = infractions.find(i=>i.code===infractionCode);
  const severity = severityByCode[infractionCode] || severityByPrefix[infractionCode.slice(0,3)] || (infractionCode.startsWith("538") ? "grave" : "média");
  const severityLabel = severity;
  const highSpeedReasons = [
  "Inadequação técnica da sinalização",
  "Obstrução visual por vegetação",
  "Falta de clareza na sinalização",
  "Ocultação da placa por folhagem",
  "Inobservância do distanciamento do medidor de velocidade",
  "Variação abrupta de velocidade no trecho",
  "Inexistência de placa regulamentar prévia",
  "Estado de necessidade decorrente de conduta criminosa",
  "Insegurança do trecho e preservação da integridade",
  "Emergência médica e estado de necessidade",
  "Vício formal e inconsistência no Auto de Infração",
];
const specific60411Reasons = [
  "Manobra autorizada por agente de trânsito",
  "Estado de necessidade decorrente de conduta criminosa",
  "Insegurança do trecho e preservação da integridade",
  "Inadequação técnica da sinalização",
];
const specific60412Reasons = [
  "Inadequação técnica da sinalização",
  "Estado de necessidade decorrente de conduta criminosa",
  "Insegurança do trecho e preservação da integridade",
  "Manobra autorizada por agente de trânsito",
];
const specific60501Reasons = [
  "Falta de clareza na sinalização",
  "Estado de necessidade decorrente de conduta criminosa",
  "A notificação não focaliza o semáforo vermelho nem indica a faixa de pedestres",
  "Inadequação técnica da sinalização",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "Ocultação da placa por folhagem",
  "Insegurança do trecho e preservação da integridade",
  "Não houve tempo hábil para parada total do veículo",
  "Emergência médica e estado de necessidade",
];
const specific60502Reasons = [
  "Insegurança do trecho e preservação da integridade",
];
const specific60503Reasons = [
  "Falta de clareza na sinalização",
  "Estado de necessidade decorrente de conduta criminosa",
  "Insegurança do trecho e preservação da integridade",
  "O condutor tentou evitar colisão traseira com outro veículo",
  "Inadequação técnica da sinalização",
  "Obstrução visual por vegetação",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "Ocultação da placa por folhagem",
  "A notificação não focaliza o semáforo vermelho nem indica a faixa de pedestres",
  "Não houve tempo hábil para parada total do veículo",
  "Emergência médica e estado de necessidade",
];

const parkingReasons = [
  "Inexistência de placa regulamentar prévia",
  "Obstrução visual por vegetação",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Emergência médica e estado de necessidade",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "Ocultação da placa por folhagem",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "Falta de clareza na sinalização",
];

const parking54522Reasons = [
  "Inexistência de placa regulamentar prévia",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "Falta de clareza na sinalização",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "Emergência médica e estado de necessidade",
  "Ocultação da placa por folhagem",
  "O condutor parou sobre a faixa para não obstruir o cruzamento",
  "A pintura da faixa encontrava-se deteriorada",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Obstrução visual por vegetação",
];
const parking55411Reasons = [
  "Defeito mecânico decorrente de impacto em buraco na via",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "Inadequação técnica da sinalização",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "Obstrução visual por vegetação",
  "Ocultação da placa por folhagem",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Emergência médica e estado de necessidade",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Inexistência de placa regulamentar prévia",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "O motorista encontrava-se em frente à sua própria casa",
  "Falta de clareza na sinalização",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
];
const parking55412Reasons = [
  "Houve equívoco do agente, pois o cartão de estacionamento estava pago e disponível no painel dianteiro do veículo",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Falta de clareza na sinalização",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "O motorista encontrava-se em frente à sua própria casa",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "Emergência médica e estado de necessidade",
  "Inadequação técnica da sinalização",
  "Ocultação da placa por folhagem",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Inexistência de placa regulamentar prévia",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "Obstrução visual por vegetação",
];
const parking55413Reasons = [
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "Inadequação técnica da sinalização",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "Emergência médica e estado de necessidade",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Ocultação da placa por folhagem",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "Obstrução visual por vegetação",
  "Falta de clareza na sinalização",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Inexistência de placa regulamentar prévia",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
];
const parking55415Reasons = [
  "O veículo estava munido da credencial exigida",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Ocultação da placa por folhagem",
  "Obstrução visual por vegetação",
  "Inadequação técnica da sinalização",
  "Emergência médica e estado de necessidade",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Falta de clareza na sinalização",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "Inexistência de placa regulamentar prévia",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
];
const parking55417Reasons = ["O veículo foi estacionado com o pisca-alerta acionado"];
const parking555Reasons = [
  "A manobra foi permitida por autoridade de trânsito",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "Inadequação técnica da sinalização",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "Falta de clareza na sinalização",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "Ocultação da placa por folhagem",
  "Obstrução visual por vegetação",
  "Emergência médica e estado de necessidade",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "Inexistência de placa regulamentar prévia",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "O motorista encontrava-se em frente à sua própria casa",
  "O condutor apenas viabilizou o embarque de um passageiro",
];
const parking55680Reasons = [
  "O condutor, na realidade, realizava o desembarque de um passageiro",
  "Falta de clareza na sinalização",
  "A manobra foi permitida por autoridade de trânsito",
  "O condutor levava a bordo uma pessoa em cadeira de rodas",
  "Obstrução visual por vegetação",
  "Emergência médica e estado de necessidade",
  "Inexistência de placa regulamentar prévia",
  "O condutor precisou averiguar se alguma lanterna estava queimada",
  "Ocultação da placa por folhagem",
  "Houve equívoco do agente, pois a rua é demasiadamente estreita para permitir parada afastada da margem",
  "Defeito mecânico decorrente de impacto em buraco na via",
  "Inadequação técnica da sinalização",
  "O local não é entrada de garagem, mas acesso a estabelecimento comercial",
  "Estado de deterioração ou degradação das placas de trânsito, prejudicando a sua leitura",
  "O motorista encontrava-se em frente à sua própria casa",
  "O motorista deixou o veículo a fim de retirar um objeto que obstruía a via",
  "O condutor apenas viabilizou o embarque de um passageiro",
  "O veículo, na realidade, permaneceu imóvel em razão do impacto contra um buraco na pista",
];
const parking56060Reasons = ["O motorista encontrava-se em frente à sua própria casa"];
const parking56222Reasons = ["A pintura da faixa encontrava-se deteriorada", "Defeito mecânico decorrente de impacto em buraco na via", "O condutor parou sobre a faixa para não obstruir o cruzamento"];
const parking56731Reasons = ["O condutor parou sobre a faixa para não obstruir o cruzamento", "A pintura da faixa encontrava-se deteriorada"];
const parking56732Reasons = ["A pintura da faixa encontrava-se deteriorada", "O condutor parou sobre a faixa para não obstruir o cruzamento"];
const parking90751Reasons = ["Defeito mecânico decorrente de impacto em buraco na via", "Inadequação técnica da sinalização"];
const parking56650Reasons = ["A manobra foi permitida por autoridade de trânsito"];
const parking57461Reasons = ["Inadequação técnica da sinalização", "Inexistência de placa regulamentar prévia"];
const parking57462Reasons = ["Inexistência de placa regulamentar prévia"];
const parking68661Reasons = ["O motorista, na verdade, conduzia consigo membros de sua família"];
const parking75870Reasons = ["Um veículo de grande porte cortou a frente do condutor", "A pintura da faixa encontrava-se deteriorada", "Inexistência de placa regulamentar prévia", "O motorista teve de adentrar e deixar sua faixa exclusiva a fim de prevenir acidente", "Estado de necessidade decorrente de conduta criminosa", "A sinalização confusa obrigou o condutor a trocar de faixa", "A via reservada ao motorista estava obstruída", "O motorista tentou impedir colisão na traseira com outro veículo", "O condutor parou sobre a faixa para não obstruir o cruzamento"];
const seatbeltReasons = ["Por causa da película nos vidros, o agente não percebeu que o cinto estava afivelado", "Em razão da obesidade, o condutor precisou posicionar o cinto sobre o ombro", "O motorista desfez o uso do cinto a fim de auxiliar no desembarque de um passageiro", "O agente não abordou o veículo para lavrar a autuação"];
const phone73662Reasons = ["O condutor operava um rádio amador, e não um aparelho celular", "Em virtude da película nos vidros, é possível que o agente tenha se confundido", "O motorista, na realidade, trocava de marcha ou acionava comandos do veículo"];
const standardReasons = selected?.code === "545-22"
  ? [...parking54522Reasons, ...reasons]
  : selected?.code === "545-23" || selected?.code === "545-27"
    ? [...parkingReasons, ...reasons]
    : selected?.code === "554-11"
      ? [...parking55411Reasons, ...reasons]
      : selected?.code === "554-12"
        ? [...parking55412Reasons, ...reasons]
        : selected?.code === "554-13" || selected?.code === "554-14"
          ? [...parking55413Reasons, ...reasons]
          : selected?.code === "554-15" || selected?.code === "554-16"
            ? [...parking55415Reasons, ...reasons]
            : selected?.code === "554-17"
              ? [...parking55417Reasons, ...reasons]
              : selected?.code === "555-0" || selected?.code === "555-00"
                ? [...parking555Reasons, ...reasons]
                : selected?.code === "556-80"
                  ? [...parking55680Reasons, ...reasons]
                  : selected?.code === "560-60"
                    ? [...parking56060Reasons, ...reasons]
                    : selected?.code === "562-22"
                      ? [...parking56222Reasons, ...reasons]
                      : selected?.code === "567-31"
                        ? [...parking56731Reasons, ...reasons]
                        : selected?.code === "567-32"
                          ? [...parking56732Reasons, ...reasons]
                          : selected?.code === "907-51"
                            ? [...parking90751Reasons, ...reasons]
                            : selected?.code === "566-50"
                              ? [...parking56650Reasons, ...reasons]
                              : selected?.code === "574-61"
                                ? [...parking57461Reasons, ...reasons]
                                : selected?.code === "574-62" || selected?.code === "574-63"
                                  ? [...parking57462Reasons, ...reasons]
                                  : selected?.code === "686-61"
                                    ? [...parking68661Reasons, ...reasons]
                                    : selected?.code === "758-70"
                                      ? [...parking75870Reasons, ...reasons]
                                      : selected?.code === "518-51" || selected?.code === "518-52"
                                        ? [...seatbeltReasons, ...reasons]
                                        : selected?.code === "736-62"
                                          ? [...phone73662Reasons, ...reasons]
                                          : selected?.code === "605-01"
  ? [...specific60501Reasons, ...reasons]
  : selected?.code === "605-02"
    ? [...specific60502Reasons, ...reasons]
    : selected?.code === "605-03"
      ? [...specific60503Reasons, ...reasons]
      : selected?.code === "604-12"
        ? [...specific60412Reasons, ...reasons]
        : selected?.code === "604-11"
          ? [...specific60411Reasons, ...reasons]
    : selected?.code === "747-10"
    ? [...highSpeedReasons, ...reasons]
    : selected && ["745-50","746-30"].includes(selected.code)
      ? [...speedInfractionReasons, ...reasons]
      : reasons;
  const specialist = reason === "Motivo revisado por especialista";
  const basePrice = plan === "anual" ? 49.99*12 : specialist ? 39.99 : severityPrice[severity] || 19.99;
  const discount = couponApplied ? basePrice*0.1 : 0;
  const total = Math.max(0,basePrice-discount);
  const normalizedSearch = normalizeInfractionSearch(search);
  const filteredInfractions = useMemo(()=>infractions.filter(i=>normalizeInfractionSearch(i.code+" "+i.description).includes(normalizedSearch)).slice(0,60),[infractions,normalizedSearch]);

  useEffect(()=>{ loadInfractions().then(setInfractions).catch(()=>setInfractions([
    {code:"501-00",description:"Dirigir veículo sem possuir CNH ou Permissão para Dirigir"},
    {code:"502-91",description:"Dirigir veículo com CNH cassada"},{code:"502-92",description:"Dirigir veículo com Permissão para Dirigir cassada"},
    {code:"605-01",description:"Avançar o sinal vermelho do semáforo"},{code:"745-50",description:"Transitar em velocidade superior máxima permitida em até 20%"},
  ])); },[]);
  useEffect(()=>{
    const cepDigits = person.cep.replace(/\D/g,"");
    if (cepDigits.length !== 8) {
      setCepLookupStatus("");
      return;
    }
    let active = true;
    setCepLookupStatus("Consultando CEP…");
    fetch("https://viacep.com.br/ws/"+cepDigits+"/json/")
      .then(response => {
        if (!response.ok) throw new Error("Falha ao consultar o CEP");
        return response.json();
      })
      .then((data:{erro?:boolean;logradouro?:string; bairro?:string;localidade?:string;uf?:string})=>{
        if (!active) return;
        if (data.erro) {
          setCepLookupStatus("CEP não encontrado. Confira o número ou preencha o endereço manualmente.");
          return;
        }
        setPerson(current=>({
          ...current,
          street:data.logradouro || current.street,
          district:data.bairro || current.district,
          personCity:data.localidade || current.personCity,
          personState:states.includes(data.uf || "") ? (data.uf as string) : current.personState,
        }));
        setCepLookupStatus("Endereço preenchido pelo CEP. Confira os dados antes de continuar.");
      })
      .catch(()=>{
        if (active) setCepLookupStatus("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
      });
    return ()=>{active=false;};
  },[person.cep]);
  useEffect(()=>{
    let live=true;
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+uf+"/municipios?orderBy=nome")
      .then(r=>r.ok?r.json():[]).then((data:Array<{nome:string}>)=>{if(live){setCities(data.map(x=>x.nome));setCity("");}})
      .catch(()=>{if(live)setCities(uf==="SP"?["São Paulo","Campinas","Santos","Ribeirão Preto","São José dos Campos","Bauru","Jaú"]:[]);});
    return ()=>{live=false;};
  },[uf]);
  useEffect(()=>{
    const onPop=()=>setAdmin(window.location.pathname==="/admin");
    window.addEventListener("popstate",onPop); setAdmin(window.location.pathname==="/admin");
    return ()=>window.removeEventListener("popstate",onPop);
  },[]);
  const navigateAdmin=(next:boolean)=>{history.pushState({}, "", next?"/admin":"/");setAdmin(next);setStep(1);};
  const next=()=>{if(step===1&&(!infractionCode||!date||!time||!uf||!city||!authority||(authority==="Outro órgão"&&!otherAuthority.trim())||!reason)){setNotice("Preencha os campos obrigatórios da infração para continuar.");return;} if(step===2&&(!person.name||!person.cpf||!person.cnh||!person.street||!person.cep)){setNotice("Preencha os dados obrigatórios do condutor.");return;} if(step===3&&(!plate||!make||!model||!year||(model==="Outro modelo"&&!customModel.trim()))){setNotice("Informe placa, fabricante, modelo e ano do veículo. Se selecionar Outro modelo, digite o modelo manualmente.");return;} setNotice("");setStep(Math.min(4,step+1));window.scrollTo({top:0,behavior:"smooth"});};
  const previous=()=>{setNotice("");setStep(Math.max(1,step-1));};
  const submit=()=>{if(!confirmedTruth){setNotice("Confirme que os dados informados são verdadeiros.");return;} if(!acceptedTerms){setNotice("Leia e aceite os Termos de uso e a Política de privacidade para continuar.");return;} if(!email.includes("@")){setNotice("Informe um e-mail válido para receber o documento.");return;} if(payment==="card"&&(!card.name||card.number.replace(/\D/g,"").length<13||!card.expiry||card.cvv.length<3)){setNotice("Confira os dados do cartão.");return;} const item={id:"MAI-"+Date.now().toString().slice(-6),infraction:infractionCode+" — "+(selected?.description||""),person:person.name,status:specialist?"Pendente de Revisão (Casos de Especialista)":"Pendente de Pagamento",price:total,reason,email};setDrafts(prev=>[item,...prev]);setNotice(payment==="pix"?"Pedido criado em modo demonstração. Configure um gateway para gerar um PIX real.":"Pedido criado em modo demonstração. Nenhuma cobrança foi realizada.");};
  const brands:Record<string,string[]>={Carro:["Chevrolet","Fiat","Volkswagen","Toyota","Hyundai","Honda","Ford","Renault","Jeep","Nissan","BYD","Citroën","Peugeot","BMW","Mercedes-Benz","Audi","Volvo","GWM","Mitsubishi","Kia","CAOA Chery"],Motocicleta:["Honda","Yamaha","Suzuki","Kawasaki","BMW Motorrad","Royal Enfield","Haojue","Shineray","Triumph","Ducati","KTM","Bajaj"],Caminhão:["Mercedes-Benz","Volkswagen Caminhões","Volvo","Scania","Iveco","DAF","Ford Trucks","MAN","Agrale"]};
  const models:Record<string,string[]>={Chevrolet:["Onix","Onix Plus","Tracker","Spin","Montana","S10","Equinox"],Fiat:["Argo","Mobi","Cronos","Pulse","Fastback","Strada","Toro"],Volkswagen:["Gol","Polo","Virtus","T-Cross","Nivus","Tiguan","Saveiro","Amarok"],Toyota:["Corolla","Corolla Cross","Yaris","Hilux","SW4","Etios"],Hyundai:["HB20","HB20S","Creta","Tucson","i30"],Honda:["Civic","City","HR-V","WR-V","Fit","CG 160","Biz"],Ford:["Ka","EcoSport","Ranger","Territory","Maverick"],Renault:["Kwid","Sandero","Logan","Duster","Oroch"],Jeep:["Renegade","Compass","Commander","Gladiator"],Yamaha:["Factor 150","Fazer 250","Lander 250","NMAX","Crosser"],Suzuki:["Jimny","V-Strom 650","GSX-S"],Kawasaki:["Ninja 400","Versys 300","Z400"],"BMW Motorrad":["G 310 GS","F 850 GS","R 1250 GS"],"Mercedes-Benz":["Actros","Atego","Accelo","Sprinter"],"Volkswagen Caminhões":["Delivery","Constellation","Meteor"],Volvo:["FH","FM","VM"],Scania:["R 450","R 540","P 320"],Iveco:["Daily","Tector","S-Way"]};
  const statuses=["Pendente de Pagamento","Em Processamento pela IA","Pendente de Revisão (Casos de Especialista)","Concluído e Enviado"];
  const pageClass=dark?"min-h-screen bg-slate-950 text-slate-100":"min-h-screen bg-[#f6f8fb] text-slate-900";
  const cardClass=dark?"rounded-2xl border border-slate-800 bg-slate-900":"rounded-2xl border border-slate-200/80 bg-white shadow-sm";
  const inputClass=dark?fieldClass+" !border-slate-700 !bg-slate-950 !text-slate-100":fieldClass;
  const Header=()=> <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8"><button onClick={()=>navigateAdmin(false)} className="flex shrink-0 items-center" aria-label="Fineflow — Traffic Fines Management"><img src="/fineflow-logo.jpg?rev=multai-20261016" alt="Fineflow — Traffic Fines Management" className="h-[108px] w-[210px] object-contain sm:w-[230px]" /></button><nav className="hidden items-center gap-7 md:flex"><button onClick={()=>{navigateAdmin(false);setStep(1)}} className="text-sm font-medium text-slate-600 hover:text-blue-700">Como funciona</button><button onClick={()=>{navigateAdmin(false);setStep(4)}} className="text-sm font-medium text-slate-600 hover:text-blue-700">Planos e preços</button><button onClick={()=>navigateAdmin(true)} className="text-sm font-medium text-slate-600 hover:text-blue-700">Painel administrativo</button></nav><div className="flex items-center gap-2"><button aria-label="Alternar tema" onClick={()=>setDark(!dark)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50">{dark?<Sun size={18}/>:<Moon size={18}/>}</button><button onClick={()=>navigateAdmin(!admin)} className="hidden rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-700/15 hover:bg-blue-800 sm:block">{admin?"Voltar ao site":"Área administrativa"}</button><button onClick={()=>navigateAdmin(!admin)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 md:hidden"><Menu size={18}/></button></div></div></header>;
  const Footer=()=> <><footer className="mt-16 border-t border-slate-200 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-7 text-xs text-slate-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><p>© 2026 Multas AI · Tecnologia para elaborar sua defesa.</p><div className="flex flex-wrap gap-4"><button type="button" onClick={()=>setLegalView("terms")} className="hover:text-blue-700">Termos de uso</button><button type="button" onClick={()=>setLegalView("privacy")} className="hover:text-blue-700">Política de privacidade</button></div></div></footer>{legalView&&<div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/70 p-4" role="dialog" aria-modal="true" aria-labelledby="legal-title"><div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 text-slate-900 shadow-2xl"><div className="flex items-start justify-between gap-4"><h2 id="legal-title" className="text-xl font-extrabold">{legalView==="privacy"?"Política de privacidade":"Termos de uso"}</h2><button type="button" aria-label="Fechar informações legais" onClick={()=>setLegalView(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={20}/></button></div>{legalView==="privacy"?<><p className="mt-4 text-sm leading-7">A segurança e a confidencialidade dos seus dados são prioridades fundamentais para a Multa AI. Coletamos informações pessoais — como nome, e-mail, telefone, endereço, data de nascimento, entre outras — com o único propósito de otimizar e tornar a sua experiência em nossa plataforma a mais eficiente e personalizada possível. Todo o tratamento desses dados é realizado em estrita conformidade com as leis vigentes no país.</p></>:<div className="mt-4 space-y-3 text-sm leading-7"><p>O Multas AI prepara defesas personalizadas com base nas informações fornecidas pelo usuário.</p><p>O deferimento do recurso não é garantido. A decisão cabe ao órgão de trânsito competente e depende dos fatos e documentos de cada caso.</p><p>O usuário é responsável por fornecer informações verdadeiras, revisar o documento gerado, conferir os prazos e protocolar a defesa no órgão competente.</p></div>}<div className="mt-6 flex justify-end"><button type="button" onClick={()=>setLegalView(null)} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">Fechar</button></div></div></div>}</>;
  if(admin) return <div className={pageClass}><Header/><main className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8"><div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-blue-700">Visão geral</p><h1 className="text-3xl font-extrabold tracking-tight">Painel administrativo</h1><p className="mt-2 text-sm text-slate-500">Acompanhe solicitações e o status de cada recurso.</p></div><button onClick={()=>navigateAdmin(false)} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white"><ArrowLeft size={16}/> Voltar ao formulário</button></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[{title:"Recursos cadastrados",value:drafts.length,icon:FileText},{title:"Aguardando pagamento",value:drafts.filter(d=>d.status==="Pendente de Pagamento").length,icon:Clock3},{title:"Em revisão especializada",value:drafts.filter(d=>d.status.includes("Revisão")).length,icon:Gavel},{title:"Receita demonstrativa",value:money(drafts.reduce((s,d)=>s+d.price,0)),icon:Banknote}].map(x=><div className={cardClass+" p-5"} key={x.title}><div className="flex items-center justify-between"><span className="text-sm text-slate-500">{x.title}</span><x.icon className="text-blue-700" size={19}/></div><p className="mt-3 text-2xl font-bold">{x.value}</p></div>)}</div><section className={cardClass+" mt-7 overflow-hidden"}><div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">Recursos gerados</h2><p className="mt-1 text-xs text-slate-500">Pedidos criados nesta sessão demonstrativa.</p></div><select className={inputClass+" sm:max-w-64"} value={adminFilter} onChange={e=>setAdminFilter(e.target.value)}><option>Todos</option>{statuses.map(s=><option key={s}>{s}</option>)}</select></div><div className="overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Pedido</th><th className="px-5 py-3">Condutor</th><th className="px-5 py-3">Infração</th><th className="px-5 py-3">Valor</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Ação</th></tr></thead><tbody>{drafts.filter(d=>adminFilter==="Todos"||d.status===adminFilter).map(d=><tr key={d.id} className="border-t border-slate-100"><td className="px-5 py-4 font-semibold">{d.id}</td><td className="px-5 py-4">{d.person}</td><td className="max-w-xs truncate px-5 py-4">{d.infraction}</td><td className="px-5 py-4">{money(d.price)}</td><td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">{d.status}</span></td><td className="px-5 py-4"><div className="flex items-center gap-3"><button onClick={()=>setNotice("Minuta ainda não foi gerada: conecte o serviço de IA e armazenamento para habilitar a visualização do documento.")} className="font-semibold text-blue-700">Ver minuta</button><button onClick={()=>{const nextStatus=window.prompt("Novo status:\\n1 - Pendente de Pagamento\\n2 - Em Processamento pela IA\\n3 - Pendente de Revisão (Casos de Especialista)\\n4 - Concluído e Enviado","2");const statusMap:Record<string,string>={"1":statuses[0]!,"2":statuses[1]!,"3":statuses[2]!,"4":statuses[3]!};const mapped=nextStatus?statusMap[nextStatus]:undefined;if(mapped)setDrafts(prev=>prev.map(item=>item.id===d.id?{...item,status:mapped}:item));}} className="font-semibold text-slate-600">Status</button><button onClick={()=>setNotice("O reenvio será habilitado após integrar um provedor de e-mail e persistir a minuta gerada.")} className="font-semibold text-slate-600">Reenviar</button></div></td></tr>)}{drafts.length===0&&<tr><td colSpan={6} className="px-5 py-14 text-center"><FileText className="mx-auto mb-3 text-slate-300" size={32}/><p className="font-semibold">Nenhum recurso por enquanto</p><p className="mt-1 text-xs text-slate-500">Os pedidos criados no checkout aparecerão aqui.</p></td></tr>}</tbody></table></div></section><div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><CircleHelp size={19} className="mt-0.5 shrink-0"/><p><strong>Modo de demonstração:</strong> os dados ficam apenas no estado desta página e desaparecem ao recarregar. Para uso real, configurar autenticação, Supabase, armazenamento seguro, geração de PDF, e-mail e gateway de pagamento.</p></div></main><Footer/>{notice&&<div role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-start justify-between gap-4 rounded-2xl bg-slate-900 p-4 text-sm text-white shadow-2xl"><p>{notice}</p><button aria-label="Fechar aviso" onClick={()=>setNotice("")}><X size={18}/></button></div>}</div>;
  return <div className={pageClass}><Header/><main><section className="relative overflow-hidden bg-gradient-to-br from-[#0c2554] via-[#123b78] to-[#11665c] text-white"><div className="absolute -right-24 -top-28 h-96 w-96 rounded-full border border-white/10"/><div className="absolute -right-10 -top-12 h-64 w-64 rounded-full border border-white/10"/><div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.1fr_.9fr] md:items-center md:py-16 lg:px-8"><div><div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-blue-50"><Sparkles size={14}/> Tecnologia inteligente para sua defesa</div><h1 className="max-w-xl text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">Sua defesa de trânsito, <span className="text-emerald-300">sem complicação.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-blue-100">O Multas AI prepara defesas personalizadas com base nas informações fornecidas.</p><div className="mt-7 flex flex-wrap gap-4 text-sm text-blue-50"><span className="flex items-center gap-2"><ShieldCheck size={17} className="text-emerald-300"/> Processo guiado</span><span className="flex items-center gap-2"><LockKeyhole size={17} className="text-emerald-300"/> Cuidado com seus dados</span><span className="flex items-center gap-2"><FileCheck2 size={17} className="text-emerald-300"/> Documento organizado</span></div></div><div className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur sm:p-7"><div className="flex items-center gap-3"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300 text-emerald-950"><Gavel size={25}/></span><div><p className="font-bold">Comece sua solicitação</p><p className="text-sm text-blue-100">4 etapas · simples e orientadas</p></div></div><div className="mt-6 grid grid-cols-4 gap-2">{["Infração","Condutor","Veículo","Pagamento"].map((s,i)=><button key={s} onClick={()=>{setStep(i+1);window.scrollTo({top:0,behavior:"smooth"})}} className={"rounded-xl px-2 py-3 text-center text-xs "+(step===i+1?"bg-white text-blue-900":"bg-white/10 text-blue-100 hover:bg-white/20")}><span className="mx-auto mb-1 grid h-6 w-6 place-items-center rounded-full border border-current text-[11px] font-bold">{i+1}</span><span className="font-semibold">{s}</span></button>)}</div><p className="mt-5 text-sm leading-6 text-blue-100">Preencha os dados com atenção. Ao final, confira o valor e escolha a forma de pagamento disponível.</p></div></div></section>
  <section className="mx-auto max-w-7xl px-4 py-9 sm:px-6 lg:px-8"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-700">Solicitação de recurso</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight">{["Dados da infração","Dados do condutor","Dados do veículo","Resumo e pagamento"][step-1]}</h2><p className="mt-1 text-sm text-slate-500">Etapa {step} de 4 — {["Identifique o auto e o motivo da defesa.","Informe quem será identificado no documento.","Identifique o veículo autuado.","Revise o pedido antes de continuar."][step-1]}</p></div><div className="w-full sm:max-w-xs"><div className="mb-2 flex justify-between text-xs font-semibold text-slate-500"><span>Progresso</span><span>{step*25}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{width:(step*25)+"%"}}/></div></div></div>
  <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]"><div className={cardClass+" p-5 sm:p-7"}>{step===1&&<div className="space-y-5"><div><label className={labelClass}>Infração de trânsito <span className="text-rose-500">*</span></label><div className="relative"><Search className="absolute left-3 top-3.5 text-slate-400" size={17}/><input className={inputClass+" pl-10"} value={search|| (selected?selected.code+" — "+selected.description:"")} onChange={e=>{const value=e.target.value;const normalized=normalizeInfractionSearch(value);const match=infractions.find(i=>normalizeInfractionSearch(i.code)===normalized||normalizeInfractionSearch(i.code+" — "+i.description)===normalized);if(match){setInfractionCode(match.code);setSearch("");setReason("");}else{setSearch(value);setInfractionCode("");}}} placeholder="Buscar por código ou descrição (ex.: 501-00)"/>{search&&<div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">{filteredInfractions.map(i=><button type="button" key={i.code} onClick={()=>{setInfractionCode(i.code);setSearch("");setReason("");}} className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-blue-50"><span className="font-bold text-blue-800">{i.code}</span><span> — {i.description}</span></button>)}{filteredInfractions.length===0&&<p className="p-3 text-sm text-slate-500">Nenhuma infração encontrada.</p>}</div>}</div>{selected&&<div className="mt-2 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-sm text-blue-900"><BadgeCheck size={17} className="mt-0.5 shrink-0"/><span><strong>{selected.code}</strong> — {selected.description}<span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs font-semibold capitalize">{severityLabel}</span></span></div>}</div><div className="grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Data da infração" required><input type="date" className={inputClass} value={date} onChange={e=>setDate(e.target.value)}/></Field><Field dark={dark} label="Hora da infração" required><input type="time" className={inputClass} value={time} onChange={e=>setTime(e.target.value)}/></Field></div><div className="grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Estado (UF)" required><select className={inputClass} value={uf} onChange={e=>setUf(e.target.value)}>{states.map(s=><option key={s}>{s}</option>)}</select></Field><Field dark={dark} label="Cidade" required><select className={inputClass} value={city} onChange={e=>setCity(e.target.value)}><option value="">Selecione a cidade</option>{cities.map(c=><option key={c}>{c}</option>)}</select></Field></div><Field dark={dark} label="Órgão autuador" required><select className={inputClass} value={authority} onChange={e=>{setAuthority(e.target.value);if(e.target.value!=="Outro órgão")setOtherAuthority("");}}><option value="">Selecione o órgão autuador</option>{["DETRAN","DER","Polícia Rodoviária Federal (PRF)","DNIT","CET / órgão municipal","Prefeitura municipal","Polícia Rodoviária Estadual","Outro órgão"].map(x=><option key={x}>{x}</option>)}</select></Field>{authority==="Outro órgão"&&<Field dark={dark} label="Nome do órgão autuador" required><input className={inputClass} value={otherAuthority} onChange={e=>setOtherAuthority(e.target.value)} placeholder="Digite o nome do órgão autuador" /></Field>}<Field dark={dark} label="Escolha o motivo do recurso..." required><select className={inputClass} value={reason} onChange={e=>setReason(e.target.value)}><option value="">Escolha o motivo do recurso...</option><optgroup label="Motivos padrão">{standardReasons.map(r=><option key={r}>{r}</option>)}</optgroup><option>Motivo revisado por especialista</option></select></Field>{specialist&&<div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4"><div><h3 className="font-bold text-emerald-950">Revisão por especialista</h3><p className="mt-1 text-sm text-emerald-900">Conte o que aconteceu e anexe as duas faces da notificação para avaliação.</p></div><Field dark={dark} label="Descreva o ocorrido (mais detalhes)" required><textarea className={inputClass+" min-h-28"} value={story} onChange={e=>setStory(e.target.value)} placeholder="Descreva os fatos, o local e qualquer informação relevante..."/></Field><div className="grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Foto da multa — frente"><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-emerald-300 bg-white p-5 text-center"><UploadCloud className="mb-2 text-emerald-700" size={23}/><span className="text-sm font-semibold text-slate-700">{frontFile||"Enviar frente"}</span><span className="mt-1 text-xs text-slate-500">PDF, JPG ou PNG</span><input type="file" accept=".pdf,image/*" className="hidden" onChange={e=>setFrontFile(e.target.files?.[0]?.name||"")}/></label></Field><Field dark={dark} label="Foto da multa — verso"><label className="flex cursor-pointer flex-col items-center rounded-xl border border-dashed border-emerald-300 bg-white p-5 text-center"><UploadCloud className="mb-2 text-emerald-700" size={23}/><span className="text-sm font-semibold text-slate-700">{backFile||"Enviar verso"}</span><span className="mt-1 text-xs text-slate-500">PDF, JPG ou PNG</span><input type="file" accept=".pdf,image/*" className="hidden" onChange={e=>setBackFile(e.target.files?.[0]?.name||"")}/></label></Field></div></div>}<p className="text-xs leading-5 text-slate-500">Selecione apenas um motivo que corresponda aos fatos e aos documentos do caso.</p></div>}
  {step===2&&<div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Nome completo" required><input className={inputClass} value={person.name} onChange={e=>setPerson({...person,name:e.target.value})} placeholder="Nome conforme documento"/></Field><Field dark={dark} label="CPF" required><input className={inputClass} value={person.cpf} onChange={e=>setPerson({...person,cpf:e.target.value})} placeholder="000.000.000-00"/></Field><Field dark={dark} label="RG"><input className={inputClass} value={person.rg} onChange={e=>setPerson({...person,rg:e.target.value})} placeholder="Número do RG"/></Field><Field dark={dark} label="CNH" required><input className={inputClass} value={person.cnh} onChange={e=>setPerson({...person,cnh:e.target.value})} placeholder="Registro da CNH"/></Field></div><div className="border-t border-slate-100 pt-5"><h3 className="mb-4 font-bold">Endereço do condutor</h3><div className="grid gap-4 sm:grid-cols-[1fr_120px]"><Field dark={dark} label="Rua / Avenida" required><input className={inputClass} value={person.street} onChange={e=>setPerson({...person,street:e.target.value})} placeholder="Logradouro"/></Field><Field dark={dark} label="Número"><input className={inputClass} value={person.number} onChange={e=>setPerson({...person,number:e.target.value})} placeholder="Nº"/></Field></div><div className="mt-4 grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Bairro"><input className={inputClass} value={person.district} onChange={e=>setPerson({...person,district:e.target.value})} placeholder="Bairro"/></Field><Field dark={dark} label="CEP" required><input className={inputClass} inputMode="numeric" autoComplete="postal-code" value={person.cep} onChange={e=>setPerson({...person,cep:e.target.value})} placeholder="00000-000"/>{cepLookupStatus&&<p role="status" className={dark?"mt-1 text-xs text-slate-300":"mt-1 text-xs text-slate-500"}>{cepLookupStatus}</p>}</Field><Field dark={dark} label="Cidade"><input className={inputClass} value={person.personCity} onChange={e=>setPerson({...person,personCity:e.target.value})} placeholder="Cidade"/></Field><Field dark={dark} label="Estado"><select className={inputClass} value={person.personState} onChange={e=>setPerson({...person,personState:e.target.value})}>{states.map(s=><option key={s}>{s}</option>)}</select></Field></div></div><div className="flex gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-900"><LockKeyhole className="mt-0.5 shrink-0" size={18}/><p>Seus dados são usados para preencher a minuta. Em produção, habilite controles de acesso, criptografia, política de retenção e conformidade com a LGPD.</p></div></div>}
  {step===3&&<div className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><Field dark={dark} label="Tipo de veículo" required><select className={inputClass} value={vehicleType} onChange={e=>{setVehicleType(e.target.value);setMake("");setModel("");}}>{["Carro","Motocicleta","Caminhão"].map(t=><option key={t}>{t}</option>)}</select></Field><Field dark={dark} label="Placa do veículo" required><input className={inputClass+" uppercase"} value={plate} onChange={e=>setPlate(e.target.value.toUpperCase())} placeholder="ABC1D23" maxLength={7}/></Field><Field dark={dark} label="Fabricante" required><select className={inputClass} value={make} onChange={e=>{setMake(e.target.value);setModel("");}}><option value="">Selecione fabricante</option>{(brands[vehicleType]??[]).map(b=><option key={b}>{b}</option>)}</select></Field><Field dark={dark} label="Modelo" required><select className={inputClass} value={model} onChange={e=>{setModel(e.target.value);setCustomModel("");}}><option value="">Selecione modelo</option>{(models[make]||[]).map(m=><option key={m}>{m}</option>)}<option>Outro modelo</option></select>{model==="Outro modelo"&&<div className="mt-2"><Field dark={dark} label="Informe o modelo do veículo" required><input className={inputClass} value={customModel} onChange={e=>setCustomModel(e.target.value)} placeholder="Digite o modelo do veículo" required aria-required="true"/></Field></div>}</Field><Field dark={dark} label="Ano de fabricação" required><select className={inputClass} value={year} onChange={e=>setYear(e.target.value)}><option value="">Selecione o ano</option>{Array.from({length:40},(_,i)=>String(new Date().getFullYear()+1-i)).map(y=><option key={y}>{y}</option>)}</select></Field><Field dark={dark} label="RENAVAM"><input className={inputClass} value={renavam} onChange={e=>setRenavam(e.target.value)} placeholder="Número do RENAVAM"/></Field></div><div className="rounded-2xl border border-slate-200 p-5"><div className="flex items-center gap-3"><CarFront className="text-blue-700" size={25}/><div><p className="font-bold">Confira os dados do veículo</p><p className="mt-1 text-sm text-slate-500">Use as informações do documento do veículo (CRLV).</p></div></div><p className="mt-4 text-sm text-slate-600">Tipo: {vehicleType} · Fabricante: {make||"—"} · Modelo: {model==="Outro modelo"?(customModel||"Outro modelo"):(model||"—")} · Ano: {year||"—"}</p></div></div>}
  {step===4&&<div className="space-y-6"><div className={dark?"rounded-2xl border border-slate-700 bg-slate-900 p-5":"rounded-2xl bg-gradient-to-br from-blue-50 to-emerald-50 p-5"}><p className={dark?"text-sm font-semibold text-blue-200":"text-sm font-semibold text-blue-900"}>Resumo da solicitação</p><div className="mt-4 space-y-3 text-sm"><div className="flex justify-between gap-4"><span className={dark?"text-slate-300":"text-slate-600"}>Infração</span><span className="max-w-[60%] text-right font-semibold">{infractionCode||"Não selecionada"} — {selected?.description||""}</span></div><div className="flex justify-between"><span className={dark?"text-slate-300":"text-slate-600"}>Condutor</span><span className="font-semibold">{person.name||"—"}</span></div><div className="flex justify-between"><span className={dark?"text-slate-300":"text-slate-600"}>Veículo</span><span className="font-semibold">{plate||"—"} · {make} {model==="Outro modelo"?(customModel||"Outro modelo"):model}</span></div><div className="flex justify-between"><span className={dark?"text-slate-300":"text-slate-600"}>Motivo</span><span className="max-w-[60%] text-right font-semibold">{reason||"—"}</span></div></div></div><div><h3 className="mb-3 font-bold">Escolha seu plano</h3><div className="grid gap-3 sm:grid-cols-2"><button onClick={()=>setPlan("avulso")} className={"rounded-2xl border p-4 text-left transition "+(plan==="avulso"?(dark?"border-blue-400 bg-blue-950 ring-2 ring-blue-900":"border-blue-600 bg-blue-50 ring-2 ring-blue-100"):(dark?"border-slate-700 bg-slate-900 hover:border-blue-500":"border-slate-200 hover:border-blue-300"))}><span className="flex items-center justify-between font-bold">Recurso avulso {plan==="avulso"&&<Check size={17} className={dark?"text-blue-300":"text-blue-700"}/>}</span><span className="mt-2 block text-2xl font-extrabold">{money(severityPrice[severity]||19.99)}</span><span className={dark?"mt-1 block text-xs text-slate-300":"mt-1 block text-xs text-slate-500"}>Preço pela gravidade da infração.</span></button><button onClick={()=>setPlan("anual")} className={"rounded-2xl border p-4 text-left transition "+(plan==="anual"?(dark?"border-emerald-400 bg-emerald-950 ring-2 ring-emerald-900":"border-emerald-600 bg-emerald-50 ring-2 ring-emerald-100"):(dark?"border-slate-700 bg-slate-900 hover:border-emerald-500":"border-slate-200 hover:border-emerald-300"))}><span className="flex items-center justify-between font-bold">Plano anual <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold uppercase text-emerald-800">Economize</span></span><span className="mt-2 block text-2xl font-extrabold">R$ 49,99<span className="text-sm font-medium">/mês</span></span><span className={dark?"mt-1 block text-xs text-slate-300":"mt-1 block text-xs text-slate-500"}>Cobrança anual de R$ 599,88, com opção de parcelamento em até 12x no cartão</span></button></div></div><div><h3 className="mb-3 font-bold">Forma de pagamento</h3><div className="grid gap-3 sm:grid-cols-2"><button onClick={()=>setPayment("pix")} className={"flex items-center gap-3 rounded-xl border p-4 text-left "+(payment==="pix"?(dark?"border-blue-400 bg-blue-950":"border-blue-600 bg-blue-50"):(dark?"border-slate-700 bg-slate-900":"border-slate-200"))}><Banknote size={22} className={dark?"text-emerald-300":"text-emerald-700"}/><span><strong className="block text-sm">PIX</strong><span className={dark?"text-xs text-slate-300":"text-xs text-slate-500"}>Pagamento instantâneo</span></span></button><button onClick={()=>setPayment("card")} className={"flex items-center gap-3 rounded-xl border p-4 text-left "+(payment==="card"?(dark?"border-blue-400 bg-blue-950":"border-blue-600 bg-blue-50"):(dark?"border-slate-700 bg-slate-900":"border-slate-200"))}><CreditCard size={22} className={dark?"text-blue-300":"text-blue-700"}/><span><strong className="block text-sm">Cartão de crédito</strong><span className={dark?"text-xs text-slate-300":"text-xs text-slate-500"}>{plan==="anual"?"Plano anual em até 12x":"Parcelamento conforme valor"}</span></span></button></div></div>{payment==="card"&&<div className={dark?"space-y-4 rounded-2xl border border-slate-700 bg-slate-900 p-4":"space-y-4 rounded-2xl border border-slate-200 p-4"}><Field dark={dark} label="Nome impresso no cartão" required><input className={inputClass} value={card.name} onChange={e=>setCard({...card,name:e.target.value})} placeholder="Nome no cartão"/></Field><Field dark={dark} label="Número do cartão" required><input className={inputClass} inputMode="numeric" value={card.number} onChange={e=>setCard({...card,number:e.target.value})} placeholder="0000 0000 0000 0000" maxLength={19}/></Field><div className="grid grid-cols-2 gap-4"><Field dark={dark} label="Validade" required><input className={inputClass} value={card.expiry} onChange={e=>setCard({...card,expiry:e.target.value})} placeholder="MM/AA" maxLength={5}/></Field><Field dark={dark} label="CVV" required><input className={inputClass} value={card.cvv} onChange={e=>setCard({...card,cvv:e.target.value})} placeholder="123" maxLength={4}/></Field></div><Field dark={dark} label="Parcelamento"><select className={inputClass} value={installments} onChange={e=>setInstallments(Number(e.target.value))}>{Array.from({length:plan==="anual"?12:3},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}x de {money(total/n)}{n===1?" à vista":" sem juros"}</option>)}</select></Field><p className={dark?"text-xs text-slate-300":"text-xs text-slate-500"}>Demonstração: não informe dados reais de cartão. Um gateway seguro deve coletar e tokenizar os dados.</p></div>}<div className={dark?"rounded-2xl border border-slate-700 bg-slate-900 p-4":"rounded-2xl border border-slate-200 p-4"}><h3 className="font-bold">Cupom de desconto</h3><p className={dark?"mt-1 text-xs text-slate-300":"mt-1 text-xs text-slate-500"}>Teste o cupom MULTAS10 para 10% de desconto demonstrativo.</p><div className="mt-3 flex gap-2"><input className={inputClass} value={coupon} onChange={e=>{setCoupon(e.target.value.toUpperCase());setCouponApplied(false);}} placeholder="Digite seu cupom"/><button onClick={()=>{setCouponApplied(coupon.trim()==="MULTAS10");setNotice(coupon.trim()==="MULTAS10"?"Cupom aplicado!":"Cupom inválido ou expirado.");}} className={dark?"shrink-0 rounded-xl border border-slate-700 px-4 text-sm font-semibold hover:bg-slate-800":"shrink-0 rounded-xl border border-slate-200 px-4 text-sm font-semibold hover:bg-slate-50"}>Aplicar</button></div>{couponApplied&&<p className={dark?"mt-2 text-xs font-semibold text-emerald-300":"mt-2 text-xs font-semibold text-emerald-700"}>Desconto de 10% aplicado.</p>}</div><Field dark={dark} label="E-mail para receber a defesa finalizada" required><input type="email" className={inputClass} value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@exemplo.com"/></Field><div className="rounded-2xl bg-slate-900 p-5 text-white"><div className="flex justify-between text-sm text-slate-300"><span>{plan==="anual"?"Plano anual":"Recurso avulso"} · {severityLabel}</span><span>{money(basePrice)}</span></div>{couponApplied&&<div className="mt-2 flex justify-between text-sm text-emerald-300"><span>Desconto do cupom</span><span>− {money(discount)}</span></div>}<div className="my-4 border-t border-white/15"/><div className="flex items-end justify-between"><span className="text-sm text-slate-300">Total a pagar</span><span className="text-3xl font-extrabold">{money(total)}</span></div>{plan==="anual"&&<p className="mt-2 text-xs text-slate-400">Cobrança anual de {money(total)}. O valor mensal de referência é R$ 49,99 antes de descontos.</p>}{plan==="avulso"&&<p className="mt-2 text-xs text-slate-400">PIX ou cartão em até 3x, conforme as condições do meio de pagamento.</p>}</div><label className={dark?"flex items-start gap-3 text-xs leading-5 text-slate-300":"flex items-start gap-3 text-xs leading-5 text-slate-600"}><input type="checkbox" className="mt-1" checked={confirmedTruth} onChange={e=>setConfirmedTruth(e.target.checked)}/><span>Confirmo que as informações fornecidas são verdadeiras.</span></label><label className={dark?"flex items-start gap-3 text-xs leading-5 text-slate-300":"flex items-start gap-3 text-xs leading-5 text-slate-600"}><input type="checkbox" className="mt-1" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)}/><span>Li e aceito os <button type="button" className="font-semibold underline" onClick={()=>setLegalView("terms")}>Termos de uso</button> e a <button type="button" className="font-semibold underline" onClick={()=>setLegalView("privacy")}>Política de privacidade</button>.</span></label></div>}
  {notice&&<div role="status" className="mt-5 flex items-start justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><span>{notice}</span><button aria-label="Fechar aviso" onClick={()=>setNotice("")}><X size={17}/></button></div>}<div className="mt-7 flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between"><button onClick={previous} disabled={step===1} className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={16}/> Voltar</button>{step<4?<button onClick={next} className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-700/15 hover:bg-blue-800">Continuar <ArrowRight size={16}/></button>:<button onClick={submit} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-700/15 hover:bg-emerald-800"><LockKeyhole size={16}/> Criar solicitação</button>}</div></div>
  <aside className="space-y-4 lg:sticky lg:top-24"><div className={cardClass+" p-5"}><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><Gauge size={20}/></span><div><h3 className="font-bold">Como funciona</h3><p className="text-xs text-slate-500">Seu caminho em 4 passos</p></div></div><div className="mt-5 space-y-4">{[{n:"01",title:"Informe a infração",desc:"Dados do auto e motivo do recurso."},{n:"02",title:"Identifique o condutor",desc:"Dados pessoais e endereço."},{n:"03",title:"Informe o veículo",desc:"Placa, fabricante e modelo."},{n:"04",title:"Revise e pague",desc:"Confira os dados e o preço final."}].map((x,i)=><button key={x.n} onClick={()=>setStep(i+1)} className="flex w-full items-start gap-3 text-left"><span className={"grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold "+(step===i+1?"bg-blue-700 text-white":"bg-slate-100 text-slate-500")}>{step>i+1?<Check size={15}/>:x.n}</span><span><span className="block text-sm font-semibold">{x.title}</span><span className="mt-0.5 block text-xs leading-5 text-slate-500">{x.desc}</span></span></button>)}</div></div><div className={cardClass+" p-5"}><div className="flex items-center gap-2"><Sparkles size={18} className="text-emerald-700"/><h3 className="font-bold">Preços transparentes</h3></div><p className="mt-1 text-xs text-slate-500">Recurso avulso por gravidade</p><div className="mt-4 space-y-3">{Object.entries(severityPrice).map(([s,p])=><div key={s} className={"flex items-center justify-between rounded-lg px-3 py-2 text-sm "+(severity===s&&plan==="avulso"?"bg-blue-50 text-blue-900":"")}><span className="capitalize">{s}</span><span className="font-bold">{money(p)}</span></div>)}</div><div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="text-sm font-bold text-emerald-900">Plano anual</p><p className="mt-1 text-xs text-emerald-800">R$ 49,99/mês · R$ 599,88 por ano</p></div></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex items-center gap-2"><ShieldCheck size={19} className="text-blue-700"/><h3 className="font-bold">Importante saber</h3></div><p className={dark?"mt-2 text-xs leading-5 text-slate-300":"mt-2 text-xs leading-5 text-slate-500"}>O Multas AI prepara defesas personalizadas com base nas informações fornecidas, mas não é possível garantir o deferimento, pois a decisão cabe ao órgão de trânsito competente.</p></div></aside></div></section></main><Footer/>{notice&&<div className="fixed bottom-4 left-4 right-4 z-50 mx-auto flex max-w-xl items-start justify-between gap-4 rounded-2xl bg-slate-900 p-4 text-sm text-white shadow-2xl"><p>{notice}</p><button aria-label="Fechar aviso" onClick={()=>setNotice("")}><X size={18}/></button></div>}</div>;
}
