import { useMemo, useState } from "react";

import { useGame, type Question } from "@entities/game";
import { legal } from "@shared/config/legal";

type SavedPlayer = { code: string; nickname: string; player_token?: string };
type MyAnswer = { questionId: string; optionIds: string[]; text: string };

export function JoinPage() {
  const saved = readPlayer();
  const preset = new URLSearchParams(window.location.search).get("code") ?? saved?.code ?? "";
  const [code, setCode] = useState(preset);
  const [nickname, setNickname] = useState(saved?.nickname ?? "");
  const [session, setSession] = useState<SavedPlayer | null>(saved?.player_token ? saved : null);
  const [myAnswer, setMyAnswer] = useState<MyAnswer | null>(null);
  const [consent, setConsent] = useState(false);
  const hello = useMemo(
    () =>
      session
        ? { join_room: { code: session.code, nickname: session.nickname, player_token: session.player_token ?? "" } }
        : null,
    [session],
  );
  const { view, send } = useGame(hello);

  const questionId = view.question?.question_id ?? null;
  const [prevQuestionId, setPrevQuestionId] = useState(questionId);
  if (prevQuestionId !== questionId) {
    setPrevQuestionId(questionId);
    setMyAnswer(null);
  }

  function leave() {
    sessionStorage.removeItem("quizelive.player");
    const url = new URL(window.location.href);
    if (url.searchParams.has("code")) {
      url.searchParams.delete("code");
      window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
    }
    setSession(null);
    setCode("");
    setConsent(false);
  }

  if (!session) {
    return (
      <main className="panel">
        <p className="mark">Пульт</p>
        <h1>Войти в комнату</h1>
        <input inputMode="numeric" maxLength={4} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="Код" />
        <input maxLength={20} value={nickname} onChange={(event) => setNickname(event.target.value)} placeholder="Имя" />
        <label className="consent">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
          <span>
            Соглашаюсь на обработку имени по{" "}
            <a href={legal.privacyUrl} target="_blank" rel="noreferrer">
              политике конфиденциальности
            </a>
          </span>
        </label>
        <button
          className="primary"
          type="button"
          disabled={!consent || code.length !== 4 || nickname.trim().length === 0}
          onClick={() => setSession({ code, nickname: nickname.trim() })}
        >
          Войти
        </button>
      </main>
    );
  }

  const question = view.question;
  const correctIds = new Set(view.reveal?.correct_option_ids ?? []);
  const mineIds = new Set(
    myAnswer !== null && question && myAnswer.questionId === question.question_id ? myAnswer.optionIds : [],
  );
  const stranded = Boolean(view.error) || view.phase === "finished";

  if (stranded) {
    return (
      <main className="panel">
        <p className="mark">Пульт</p>
        {view.phase === "finished" ? (
          <Place board={view.board} nickname={session.nickname} finished />
        ) : (
          <>
            <h1>Комната недоступна</h1>
            {view.error ? <p className="error">{view.error}</p> : null}
          </>
        )}
        <button className="primary" type="button" onClick={leave}>
          Выйти
        </button>
      </main>
    );
  }

  return (
    <main className="panel">
      <p className="mark">{view.code || session.code}</p>
      <button className="choice" type="button" onClick={leave}>
        Выйти
      </button>
      {!view.connected ? <p className="muted">Подключаемся…</p> : null}
      {view.phase === "lobby" ? <h1>Вы в комнате. Ждём старт.</h1> : null}
      {view.phase === "question" && question ? (
        <AnswerForm
          key={question.question_id}
          question={question}
          accepted={view.accepted}
          picked={mineIds}
          lockedText={myAnswer?.questionId === question.question_id ? myAnswer.text : ""}
          onSubmit={(optionIds, answer) => {
            setMyAnswer({ questionId: question.question_id, optionIds, text: answer });
            send({
              submit_answer: {
                question_id: question.question_id,
                option_ids: optionIds,
                text: answer,
              },
            });
          }}
        />
      ) : null}
      {view.phase === "reveal" && question ? (
        <RevealBoard
          question={question}
          correctIds={correctIds}
          mineIds={mineIds}
          myText={myAnswer?.questionId === question.question_id ? myAnswer.text : ""}
          correctTexts={view.reveal?.correct_texts ?? []}
        />
      ) : null}
      {view.phase === "leaderboard" ? <Place board={view.board} nickname={session.nickname} finished={false} /> : null}
    </main>
  );
}

function RevealBoard({
  question,
  correctIds,
  mineIds,
  myText,
  correctTexts,
}: {
  question: Question;
  correctIds: Set<string>;
  mineIds: Set<string>;
  myText: string;
  correctTexts: string[];
}) {
  const normalizedCorrect = new Set(correctTexts.map(normalizeText));
  const myTextOk = myText.trim() !== "" && normalizedCorrect.has(normalizeText(myText));
  const showWrongText = question.type === "text" && myText.trim() !== "" && !myTextOk;

  return (
    <section>
      {question.image_url ? <img className="question-image" alt="" src={question.image_url} /> : null}
      <h1>{question.text}</h1>
      <div className="choices">
        {(question.options ?? []).map((option) => (
          <p className={optionVerdictClass(option.id, correctIds, mineIds)} key={option.id}>
            {option.text}
          </p>
        ))}
        {correctTexts.map((item) => (
          <p className="choice verdict-correct" key={`ok-${item}`}>
            {item}
          </p>
        ))}
        {showWrongText ? <p className="choice verdict-wrong">{myText}</p> : null}
      </div>
    </section>
  );
}

function optionVerdictClass(optionId: string, correctIds: Set<string>, mineIds: Set<string>) {
  if (correctIds.has(optionId)) return "choice verdict-correct";
  if (mineIds.has(optionId)) return "choice verdict-wrong";
  return "choice";
}

function normalizeText(value: string) {
  return value.trim().toLocaleLowerCase("ru");
}

function AnswerForm({
  question,
  accepted,
  picked,
  lockedText,
  onSubmit,
}: {
  question: Question;
  accepted: boolean;
  picked: Set<string>;
  lockedText: string;
  onSubmit: (optionIds: string[], text: string) => void;
}) {
  const [selected, setSelected] = useState<string[]>([...picked]);
  const [text, setText] = useState(lockedText);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (accepted) return;
        onSubmit(question.type === "text" ? [] : selected, question.type === "text" ? text : "");
      }}
    >
      <p className="kicker">
        {question.index} / {question.total}
      </p>
      {question.image_url ? <img className="question-image" alt="" src={question.image_url} /> : null}
      <h1>{question.text}</h1>
      {accepted ? <p className="status">Ответ принят</p> : null}
      {question.type === "text" ? (
        <input
          value={text}
          disabled={accepted}
          onChange={(event) => setText(event.target.value)}
          placeholder="Ответ"
        />
      ) : (
        <div className="choices">
          {(question.options ?? []).map((option) => (
            <button
              className={selected.includes(option.id) || picked.has(option.id) ? "choice picked" : "choice"}
              key={option.id}
              type="button"
              disabled={accepted}
              onClick={() => setSelected((current) => toggle(current, option.id, question.type === "single"))}
            >
              {option.text}
            </button>
          ))}
        </div>
      )}
      {accepted ? null : (
        <button className="primary" type="submit">
          Ответить
        </button>
      )}
    </form>
  );
}

function Place({ board, nickname, finished }: { board: { nickname: string; score: number; rank: number }[]; nickname: string; finished: boolean }) {
  const mine = board.find((entry) => entry.nickname === nickname);
  return (
    <section>
      <h1>{finished ? "Итог" : "Пока так"}</h1>
      {mine ? (
        <p className="place">
          {mine.rank} место · {mine.score}
        </p>
      ) : (
        <p className="muted">Счёт появится на экране</p>
      )}
    </section>
  );
}

function toggle(current: string[], id: string, single: boolean) {
  if (single) return [id];
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
}

function readPlayer(): SavedPlayer | null {
  const raw = sessionStorage.getItem("quizelive.player");
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as SavedPlayer;
    if (!parsed.code || !parsed.nickname) return null;
    return parsed;
  } catch {
    return null;
  }
}
