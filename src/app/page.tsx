"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  onSnapshot,
  serverTimestamp,
  doc,
  setDoc,
  Timestamp,
  Unsubscribe,
} from "firebase/firestore";
import { signInAnonymously } from "firebase/auth";
import { auth, db } from "@/lib/firebase";

type ParkingSpot = {
  level: string;
  column: string;
  number: number;
  updatedBy?: string;
  updatedAt?: Timestamp;
};

const floors = ["B4", "B5", "B6"];
const columns = ["A", "B", "C", "D"];
const numbers = [1, 2, 3, 4];

const docRef = doc(db, "parking", "current");

export default function Home() {
  const [selection, setSelection] = useState({
    level: "B5",
    column: "A",
    number: 1,
  });
  const [currentSpot, setCurrentSpot] = useState<ParkingSpot | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nickname, setNickname] = useState("");
  const [nicknameInput, setNicknameInput] = useState("");
  const [showNickname, setShowNickname] = useState(false);
  const [savedPulse, setSavedPulse] = useState(false);

  const formattedUpdatedAt = useMemo(() => {
    if (!currentSpot?.updatedAt) return "-";
    return new Intl.DateTimeFormat("ko-KR", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(currentSpot.updatedAt.toDate());
  }, [currentSpot?.updatedAt]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("parkwhereNickname");
    if (stored) {
      setNickname(stored);
      return;
    }
    setShowNickname(true);
  }, []);

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;

    const connect = async () => {
      try {
        if (!auth.currentUser) {
          await signInAnonymously(auth);
        }

        unsubscribe = onSnapshot(
          docRef,
          (snapshot) => {
            if (snapshot.exists()) {
              const spot = snapshot.data() as ParkingSpot;
              setCurrentSpot(spot);
              setSelection({
                level: spot.level,
                column: spot.column,
                number: spot.number,
              });
            } else {
              setCurrentSpot(null);
            }
            setLoading(false);
          },
          (snapshotError) => {
            setError(snapshotError.message);
            setLoading(false);
          }
        );
      } catch (connectError) {
        setError(
          connectError instanceof Error
            ? connectError.message
            : "Firebase 연결에 실패했어요."
        );
        setLoading(false);
      }
    };

    void connect();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!savedPulse) return;
    const timeoutId = window.setTimeout(() => {
      setSavedPulse(false);
    }, 1200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [savedPulse]);

  const handleSave = async () => {
    if (!nickname) {
      setShowNickname(true);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await setDoc(docRef, {
        level: selection.level,
        column: selection.column,
        number: selection.number,
        updatedBy: nickname,
        updatedAt: serverTimestamp(),
      });
      setSavedPulse(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "저장에 실패했어요."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (!trimmed) return;
    window.localStorage.setItem("parkwhereNickname", trimmed);
    setNickname(trimmed);
    setNicknameInput("");
    setShowNickname(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fff9ed,_#ffe8cf_45%,_#ffd7bd)]">
      <div className="pointer-events-none absolute -top-14 right-[-8%] h-56 w-56 rounded-full bg-[#fff4de]/90 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-12%] left-[-18%] h-72 w-72 rounded-full bg-[#ffc9b8]/70 blur-3xl" />
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-6 px-5 pb-16 pt-10 sm:px-8">
        <header className="rounded-[2rem] border border-[#f5c89d] bg-white/70 px-5 py-5 shadow-[0_16px_30px_-18px_rgba(166,109,67,0.45)] backdrop-blur">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2">
            <h1 className="text-[1.72rem] font-semibold leading-tight tracking-tight text-[#6a3d24] sm:text-3xl">
              찌북70
            </h1>
            {nickname ? (
              <p className="pt-1 text-right text-[11px] font-medium whitespace-nowrap text-[#9f6a49] sm:pt-2 sm:text-xs">
                {nickname}님 접속중
              </p>
            ) : null}
            <p className="text-sm text-[#9f6a49]">대호상희 GV70 주차 위치 찾기</p>
            {nickname ? (
              <button
                type="button"
                onClick={() => setShowNickname(true)}
                className="justify-self-end rounded-full border border-[#f1c091] bg-[#fff5e5] px-4 py-2 text-xs font-semibold text-[#9c5f38]"
              >
                이름 변경
              </button>
            ) : null}
          </div>
        </header>

        <section className="rounded-[2rem] border border-[#f2c39b] bg-[#fff8ef]/90 p-5 shadow-[0_18px_32px_-20px_rgba(141,88,51,0.4)]">
          <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
            <div
              className={`relative h-24 w-24 shrink-0 transition-transform duration-300 sm:h-28 sm:w-28 ${
                savedPulse ? "scale-105" : "scale-100"
              }`}
            >
              <Image
                src="/bear-cutout.png"
                alt="곰돌이 캐릭터"
                fill
                sizes="(max-width: 640px) 96px, 112px"
                className="object-contain drop-shadow-[0_10px_18px_rgba(152,95,56,0.28)]"
                priority
              />
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <div className="sm:text-right">
                {loading ? (
                  <p className="text-sm font-medium text-[#875334]">
                    위치 불러오는 중이에요...
                  </p>
                ) : currentSpot ? (
                  <div>
                    <p className="text-sm font-medium text-[#875334]">현재 위치는...</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-[#6f3f23]">
                      {currentSpot.level} {currentSpot.column}
                      {currentSpot.number}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm font-medium text-[#875334]">
                    아직 저장된 위치가 없어요.
                  </p>
                )}
                {savedPulse ? (
                  <p className="mt-2 text-xs font-semibold text-[#ca6f3d]">
                    멍멍쓰 주차위치 기억완료!
                  </p>
                ) : null}
              </div>
              <div className="w-full rounded-2xl border border-[#efc294] bg-[#fff3df] px-4 py-3 text-right text-xs text-[#9e6a46] sm:w-fit sm:self-end">
                <div className="font-semibold text-[#7f4a2f]">
                  {currentSpot?.updatedBy ?? "-"}
                </div>
                <div className="mt-1 font-mono text-[11px] text-[#a47453]">
                  {formattedUpdatedAt}
                </div>
              </div>
            </div>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-[#d28f7f] bg-[#fff0ec] px-4 py-3 text-xs text-[#a14848]">
              {error}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-6 rounded-[2rem] border border-[#f3c79f] bg-white/80 p-6 shadow-[0_18px_34px_-20px_rgba(131,78,48,0.42)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b27045]">
              층 선택
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3">
              {floors.map((floor) => (
                <button
                  key={floor}
                  type="button"
                  onClick={() =>
                    setSelection((prev) => ({ ...prev, level: floor }))
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    selection.level === floor
                      ? "border-[#f1a86a] bg-[#ffd9b4] text-[#6f3f23] shadow-[0_8px_20px_-12px_rgba(223,147,85,0.8)]"
                      : "border-[#f5cba9] bg-[#fff7ed] text-[#9d6746] hover:border-[#ebb288]"
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#b27045]">
              기둥번호
            </p>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {columns.map((column) => (
                <button
                  key={column}
                  type="button"
                  onClick={() =>
                    setSelection((prev) => ({ ...prev, column }))
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    selection.column === column
                      ? "border-[#f1a86a] bg-[#ffd9b4] text-[#6f3f23] shadow-[0_8px_20px_-12px_rgba(223,147,85,0.8)]"
                      : "border-[#f5cba9] bg-[#fff7ed] text-[#9d6746] hover:border-[#ebb288]"
                  }`}
                >
                  {column}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {numbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() =>
                    setSelection((prev) => ({ ...prev, number: num }))
                  }
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                    selection.number === num
                      ? "border-[#f1a86a] bg-[#ffd9b4] text-[#6f3f23] shadow-[0_8px_20px_-12px_rgba(223,147,85,0.8)]"
                      : "border-[#f5cba9] bg-[#fff7ed] text-[#9d6746] hover:border-[#ebb288]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-1 rounded-2xl bg-[#f39d5b] px-6 py-4 text-sm font-semibold text-[#fff9ef] shadow-[0_12px_30px_-16px_rgba(207,118,57,0.85)] transition hover:bg-[#e58b48] disabled:cursor-not-allowed disabled:bg-[#dfba9f]"
          >
            {saving
              ? "곰돌이가 저장 중..."
              : `🐻 ${selection.level} · ${selection.column}${selection.number} 저장하기`}
          </button>
        </section>
      </main>

      {showNickname ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-[#4d2a12]/45 p-5 sm:items-center">
          <div className="w-full max-w-md rounded-[2rem] border border-[#f2c59a] bg-[#fff8ef] px-6 py-7 shadow-2xl">
            <p className="text-sm font-semibold text-[#7f4a2f]">닉네임 입력</p>
            <p className="mt-2 text-xs text-[#a26c4c]">
              누가 변경했는지 표시하기 위해 한 번만 입력해주세요.
            </p>
            <input
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNickname();
              }}
              placeholder="예: 남편, 아내"
              className="mt-4 w-full rounded-2xl border border-[#efc59d] bg-[#fff3e2] px-4 py-3 text-sm text-[#7a472c] outline-none ring-offset-2 focus:border-[#f09b59] focus:ring-2 focus:ring-[#efccaa]"
            />
            <div className="mt-5 flex gap-3">
              {nickname ? (
                <button
                  type="button"
                  onClick={() => setShowNickname(false)}
                  className="flex-1 rounded-2xl border border-[#efc59d] px-4 py-3 text-xs font-semibold text-[#a36c49]"
                >
                  취소
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveNickname}
                className="flex-1 rounded-2xl bg-[#f39d5b] px-4 py-3 text-xs font-semibold text-[#fff9ef]"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
