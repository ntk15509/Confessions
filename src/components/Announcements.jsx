import { useEffect, useRef, useState } from "react";
import ConfessionCard from "./ConfessionCard";

export default function Announcements({ announcements, expandedId, liked, onOpen, onClose, onLike, onComment, fetchComments }) {
  const [collapsed, setCollapsed] = useState(true);
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const updateArrows = () => { const track = trackRef.current; if (!track) return; setAtStart(track.scrollLeft <= 2); setAtEnd(Math.ceil(track.scrollLeft + track.clientWidth) >= track.scrollWidth - 2); };
  const scrollOneCard = (direction) => trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth, behavior: "smooth" });
  useEffect(() => {
    updateArrows();
    const track = trackRef.current;
    const observer = track ? new ResizeObserver(updateArrows) : null;
    if (track && observer) observer.observe(track);
    return () => observer?.disconnect();
  }, [announcements.length]);
  if (!announcements.length) return null;
  return <section id="announcement_container"><div className="announcement_accordion"><button type="button" className={`announcement_toggle_btn${!collapsed ? " active" : ""}`} onClick={() => setCollapsed((value) => !value)}><span>📢 THÔNG BÁO QUAN TRỌNG ({announcements.length})</span><i className="fa-solid fa-chevron-down toggle_icon" /></button><div className={`announcement_wrapper${collapsed ? " collapsed" : ""}`}><button type="button" className={`carousel_btn prev_btn${atStart ? " hidden" : ""}`} title="Trước" onClick={() => scrollOneCard(-1)}><i className="fa-solid fa-chevron-left" /></button><div className="announcement_carousel_track" ref={trackRef} onScroll={updateArrows}>{announcements.map((item) => <ConfessionCard key={item.uuid} confession={item} expanded={expandedId === String(item.uuid)} liked={liked.includes(String(item.uuid))} onOpen={onOpen} onClose={onClose} onLike={onLike} onComment={onComment} fetchComments={fetchComments} />)}</div><button type="button" className={`carousel_btn next_btn${atEnd ? " hidden" : ""}`} title="Sau" onClick={() => scrollOneCard(1)}><i className="fa-solid fa-chevron-right" /></button></div></div></section>;
}
