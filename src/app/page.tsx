"use client";

import { useEffect, useMemo, useState } from "react";
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
              setCurrentSpot(snapshot.data() as ParkingSpot);
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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#fef7e5,_#f6f3ee_55%,_#ece3d2)]">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_#cbb58e,_transparent_70%)] opacity-60 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-15%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_#b8c2b4,_transparent_65%)] opacity-50 blur-3xl" />

      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        <header className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-[#eadfca] bg-white/70 px-3 py-1 text-xs font-medium text-[#6b5e45] shadow-sm">
              우리집 주차 기록
            </span>
            {nickname ? (
              <button
                type="button"
                onClick={() => setShowNickname(true)}
                className="text-xs font-semibold text-[#5d574f] underline-offset-4 hover:underline"
              >
                이름 변경
              </button>
            ) : null}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-[#1f1c16]">
            어디에 주차했는지
            <span className="block text-[#3a4a34]">한눈에 기록해요.</span>
          </h1>
          <p className="text-sm leading-6 text-[#6c6358]">
            B4~B6 층, A~D 기둥열, 1~4 번호를 선택하고 저장하면
            모두에게 동시에 반영돼요.
          </p>
        </header>

        <section className="rounded-3xl border border-[#eadfca] bg-white/80 p-5 shadow-[0_12px_36px_-30px_rgba(41,34,25,0.5)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8a6f]">
                현재 위치
              </p>
              <div className="mt-2 text-3xl font-semibold text-[#1f1c16]">
                {loading ? (
                  <span className="text-lg text-[#8e8474]">불러오는 중...</span>
                ) : currentSpot ? (
                  <span>
                    {currentSpot.level} · {currentSpot.column}
                    {currentSpot.number}
                  </span>
                ) : (
                  <span className="text-lg text-[#8e8474]">아직 기록 없음</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#ede4d0] bg-[#fdf8ef] px-4 py-3 text-right text-xs text-[#6f675c]">
              <div className="font-semibold text-[#3a352f]">
                {currentSpot?.updatedBy ?? "-"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-[#9c8a6f]">
                {formattedUpdatedAt}
              </div>
            </div>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-[#e8c9b2] bg-[#fff1e6] px-4 py-3 text-xs text-[#8f3f2c]">
              {error}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border border-[#e5dcc8] bg-white/90 p-6 shadow-[0_16px_40px_-30px_rgba(41,34,25,0.55)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8a6f]">
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
                      ? "border-[#2f3a2a] bg-[#2f3a2a] text-white"
                      : "border-[#e8dcc5] bg-white text-[#4b443b] hover:border-[#b9ac8f]"
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8a6f]">
              기둥 열
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
                      ? "border-[#2f3a2a] bg-[#2f3a2a] text-white"
                      : "border-[#e8dcc5] bg-white text-[#4b443b] hover:border-[#b9ac8f]"
                  }`}
                >
                  {column}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#9c8a6f]">
              번호
            </p>
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
                      ? "border-[#2f3a2a] bg-[#2f3a2a] text-white"
                      : "border-[#e8dcc5] bg-white text-[#4b443b] hover:border-[#b9ac8f]"
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
            className="mt-2 rounded-2xl bg-[#2f3a2a] px-6 py-4 text-sm font-semibold text-white shadow-[0_10px_30px_-15px_rgba(47,58,42,0.7)] transition hover:bg-[#1f251d] disabled:cursor-not-allowed disabled:bg-[#9aa494]"
          >
            {saving
              ? "저장 중..."
              : `${selection.level} · ${selection.column}${selection.number} 저장`}
          </button>
        </section>
      </main>

      {showNickname ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-5 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-[#eadfca] bg-white px-6 py-7 shadow-2xl">
            <p className="text-sm font-semibold text-[#3b342d]">닉네임 입력</p>
            <p className="mt-2 text-xs text-[#7a6f62]">
              누가 변경했는지 표시하기 위해 한 번만 입력해주세요.
            </p>
            <input
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNickname();
              }}
              placeholder="예: 남편, 아내"
              className="mt-4 w-full rounded-2xl border border-[#e5dcc8] px-4 py-3 text-sm outline-none ring-offset-2 focus:border-[#2f3a2a] focus:ring-2 focus:ring-[#d8c8a6]"
            />
            <div className="mt-5 flex gap-3">
              {nickname ? (
                <button
                  type="button"
                  onClick={() => setShowNickname(false)}
                  className="flex-1 rounded-2xl border border-[#e5dcc8] px-4 py-3 text-xs font-semibold text-[#6b6155]"
                >
                  취소
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveNickname}
                className="flex-1 rounded-2xl bg-[#2f3a2a] px-4 py-3 text-xs font-semibold text-white"
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
