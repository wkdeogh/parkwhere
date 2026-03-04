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
    <div className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#1d2a24,_#0c0f0e_55%,_#090b0a)]">
      <div className="pointer-events-none absolute -top-24 right-[-10%] h-64 w-64 rounded-full bg-[radial-gradient(circle,_#2a3c35,_transparent_70%)] opacity-60 blur-2xl" />
      <div className="pointer-events-none absolute bottom-[-20%] left-[-15%] h-96 w-96 rounded-full bg-[radial-gradient(circle,_#1f2a25,_transparent_65%)] opacity-60 blur-3xl" />
      <main className="relative z-10 mx-auto flex w-full max-w-xl flex-col gap-8 px-5 pb-16 pt-12 sm:px-8">
        <header className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight text-[#f5f2ea]">
              대호상희 GV70 찾기
            </h1>
            {nickname ? (
              <button
                type="button"
                onClick={() => setShowNickname(true)}
                className="text-xs font-semibold text-[#b3ac9f] underline-offset-4 hover:underline"
              >
                이름 변경
              </button>
            ) : null}
          </div>
          <p className="text-sm leading-6 text-[#b0a79a]">
            힐스테이트광교중앙역
          </p>
        </header>

        <section className="rounded-3xl border border-[#203129] bg-[#121815]/90 p-5 shadow-[0_16px_40px_-30px_rgba(0,0,0,0.6)] backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f8f85]">
                현재 위치
              </p>
              <div className="mt-2 text-3xl font-semibold text-[#f5f2ea]">
                {loading ? (
                  <span className="text-lg text-[#9a9f98]">불러오는 중...</span>
                ) : currentSpot ? (
                  <span>
                    {currentSpot.level} · {currentSpot.column}
                    {currentSpot.number}
                  </span>
                ) : (
                  <span className="text-lg text-[#9a9f98]">아직 기록 없음</span>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-[#1f2a25] bg-[#0f1412] px-4 py-3 text-right text-xs text-[#a7ada6]">
              <div className="font-semibold text-[#e6e1d7]">
                {currentSpot?.updatedBy ?? "-"}
              </div>
              <div className="mt-1 font-mono text-[11px] text-[#7f8f85]">
                {formattedUpdatedAt}
              </div>
            </div>
          </div>
          {error ? (
            <p className="mt-4 rounded-2xl border border-[#5a2d2d] bg-[#2a1515] px-4 py-3 text-xs text-[#f2b6b6]">
              {error}
            </p>
          ) : null}
        </section>

        <section className="flex flex-col gap-6 rounded-3xl border border-[#203129] bg-[#121815]/95 p-6 shadow-[0_18px_42px_-30px_rgba(0,0,0,0.7)]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f8f85]">
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
                      ? "border-[#8dc2a3] bg-[#8dc2a3] text-[#0c0f0e]"
                      : "border-[#233229] bg-[#0f1412] text-[#c5beb2] hover:border-[#3a5346]"
                  }`}
                >
                  {floor}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f8f85]">
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
                      ? "border-[#8dc2a3] bg-[#8dc2a3] text-[#0c0f0e]"
                      : "border-[#233229] bg-[#0f1412] text-[#c5beb2] hover:border-[#3a5346]"
                  }`}
                >
                  {column}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#7f8f85]">
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
                      ? "border-[#8dc2a3] bg-[#8dc2a3] text-[#0c0f0e]"
                      : "border-[#233229] bg-[#0f1412] text-[#c5beb2] hover:border-[#3a5346]"
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
            className="mt-2 rounded-2xl bg-[#8dc2a3] px-6 py-4 text-sm font-semibold text-[#0c0f0e] shadow-[0_10px_30px_-15px_rgba(141,194,163,0.7)] transition hover:bg-[#6da685] disabled:cursor-not-allowed disabled:bg-[#3a4a43] disabled:text-[#aab3ad]"
          >
            {saving
              ? "저장 중..."
              : `${selection.level} · ${selection.column}${selection.number} 저장`}
          </button>
        </section>
      </main>

      {showNickname ? (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/60 p-5 sm:items-center">
          <div className="w-full max-w-md rounded-3xl border border-[#1f2a25] bg-[#121815] px-6 py-7 shadow-2xl">
            <p className="text-sm font-semibold text-[#e6e1d7]">닉네임 입력</p>
            <p className="mt-2 text-xs text-[#a39a8c]">
              누가 변경했는지 표시하기 위해 한 번만 입력해주세요.
            </p>
            <input
              value={nicknameInput}
              onChange={(event) => setNicknameInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveNickname();
              }}
              placeholder="예: 남편, 아내"
              className="mt-4 w-full rounded-2xl border border-[#233229] bg-[#0f1412] px-4 py-3 text-sm text-[#e6e1d7] outline-none ring-offset-2 focus:border-[#8dc2a3] focus:ring-2 focus:ring-[#385648]"
            />
            <div className="mt-5 flex gap-3">
              {nickname ? (
                <button
                  type="button"
                  onClick={() => setShowNickname(false)}
                  className="flex-1 rounded-2xl border border-[#233229] px-4 py-3 text-xs font-semibold text-[#a9a195]"
                >
                  취소
                </button>
              ) : null}
              <button
                type="button"
                onClick={saveNickname}
                className="flex-1 rounded-2xl bg-[#8dc2a3] px-4 py-3 text-xs font-semibold text-[#0c0f0e]"
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
