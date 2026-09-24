import { memberGoalLabel } from '../../../shared/fitness-goals.js';
import React, { useEffect, useState } from 'react';
import { InitialsAvatar } from '../../components/ui/InitialsAvatar';
import { useGym } from '../../context/GymContext';
import { AppLayout } from '../../components/layout/AppLayout';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Search, Dumbbell, Target } from 'lucide-react';
import { Member } from '../../types';
import { apiUrl } from '../../lib/secureFetch';
import { formatAppDate, formatAppDateTime } from '../../utils/dateTime';

export const TrainerMembers: React.FC = () => {
  const { members, memberProgress, attendance, navigate, currentTrainer } = useGym();
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [progress, setProgress] = useState<{windowDays:number;plans:{id:string;title:string;completedExercises:number;activeDays:number;lastCompletedOn:string|null;lastCompletedAt:string|null;recentDays:{date:string;completedExercises:number}[]}[]}|null>(null);
  const [progressError, setProgressError] = useState('');
  const [progressLoading, setProgressLoading] = useState(false);
  const [progressRefresh, setProgressRefresh] = useState(0);

  const filtered = members.filter(
    m => m.assignedTrainerId === currentTrainer.id && (
      m.firstName.toLowerCase().includes(search.toLowerCase()) ||
      m.lastName.toLowerCase().includes(search.toLowerCase()) ||
      m.memberId.toLowerCase().includes(search.toLowerCase()))
  );
  const selectedAssessments = selectedMember ? memberProgress.filter(entry => entry.memberId === selectedMember.id).slice(0, 5) : [];

  useEffect(() => {
    if (!selectedMember) return;
    const controller = new AbortController();
    setProgress(null); setProgressError(''); setProgressLoading(true);
    fetch(apiUrl(`/api/v1/members/${selectedMember.id}/training-progress`), { credentials:'include', signal:controller.signal })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message || 'Unable to load training progress.'); return body.data; })
      .then(setProgress).catch(error => { if (!controller.signal.aborted) setProgressError(error instanceof Error ? error.message : 'Unable to load training progress.'); })
      .finally(() => { if (!controller.signal.aborted) setProgressLoading(false); });
    return () => controller.abort();
  }, [selectedMember?.id, progressRefresh]);

  const getMemberAttendanceCount = (memId: string) => {
    return attendance.filter(a => a.memberId === memId && a.status !== 'Denied').length;
  };

  return (
    <AppLayout
      pageTitle="Member Roster & Progress Tracking"
      pageSubtitle="Review assigned members, visit history, fitness goals, and workout plans."
      breadcrumbs={[{ label: 'Trainer Portal', path: '/trainer/dashboard' }, { label: 'Members' }]}
    >

      
      <div className="bg-white border border-[#E5E7EB] rounded-lg p-4 mb-6 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search member by name or ID..."
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded text-xs text-[#111111] focus:bg-white focus:border-[#EF1B23] focus:outline-none"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
        </div>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(member => {
          const checkInCount = getMemberAttendanceCount(member.memberId);
          return (
            <div
              key={member.id}
              className="bg-white border border-[#E5E7EB] rounded-lg p-5 shadow-xs flex flex-col justify-between hover:border-gray-400 transition-colors"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <InitialsAvatar src={member.photo} firstName={member.firstName} lastName={member.lastName} className="h-12 w-12"/>
                    <div>
                      <h4 className="font-bold text-[#111111] text-sm">
                        {member.firstName} {member.lastName}
                      </h4>
                      <span className="text-[11px] font-mono text-gray-400 block">
                        {member.memberId}
                      </span>
                    </div>
                  </div>
                  <Badge variant={member.membershipStatus === 'Active' ? 'success' : 'danger'}>
                    {member.membershipStatus}
                  </Badge>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-gray-50 rounded border border-gray-100">
                    <span className="text-gray-500 text-[10px] uppercase font-bold block mb-0.5">
                      Target Goal
                    </span>
                    <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#EF1B23]" />
                      {memberGoalLabel(member.fitnessGoal)}
                    </span>
                    {member.fitnessGoalNotes && <p className="mt-1 text-[11px] leading-5 text-gray-600">{member.fitnessGoalNotes}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Tier</span>
                      <span className="font-bold text-gray-800 truncate block">
                        {member.membershipPlanName}
                      </span>
                    </div>
                    <div className="p-2 bg-gray-50 rounded border border-gray-100">
                      <span className="text-gray-400 block text-[10px]">Gate Scans</span>
                      <span className="font-bold text-gray-800 block">
                        {checkInCount} sessions
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                <button
                  onClick={() => navigate(`/trainer/plans?memberId=${encodeURIComponent(member.id)}`)}
                  disabled={!member.workoutPlanEnabled || !member.trainerAccess}
                  className="w-full py-2 bg-[#151515] hover:bg-black disabled:cursor-not-allowed disabled:opacity-50 text-white font-athletic font-bold uppercase text-[11px] rounded transition-colors flex items-center justify-center gap-1.5"
                >
                  <Dumbbell className="w-3.5 h-3.5 text-[#EF1B23]" />
                  Create Workout Program
                </button>
                <button type="button" onClick={() => setSelectedMember(member)} className="rounded border border-gray-300 px-3 py-2 text-[11px] font-bold uppercase text-gray-700 hover:border-gray-500">Progress</button>
              </div>
            </div>
          );
        })}
      </div>

      
      {selectedMember && (
        <Modal
          isOpen={Boolean(selectedMember)}
          onClose={() => setSelectedMember(null)}
          title="MEMBER TRAINING PROGRESS"
          subtitle={`${selectedMember.firstName} ${selectedMember.lastName}`}
        >
          <div className="space-y-5 text-xs">
            {progressError && <div role="alert" className="flex items-center justify-between gap-3 rounded border border-red-200 bg-red-50 p-3 text-red-700"><span>{progressError}</span>{!progress && <button type="button" onClick={() => setProgressRefresh(value => value + 1)} className="rounded border border-red-300 bg-white px-2 py-1 font-bold">Retry</button>}</div>}
            <section>
              <h3 className="mb-2 font-bold uppercase">Workout activity, last 30 days</h3>
              {!progress ? progressLoading ? <p className="text-gray-500">Loading activity...</p> : !progressError ? <p className="text-gray-500">No activity available.</p> : null : progress.plans.length ? (
                <div className="space-y-2">
                  {progress.plans.map(plan => <div key={plan.id} className="rounded border border-gray-200 p-3">
                    <strong className="block text-sm">{plan.title}</strong>
                    <span className="text-gray-600">{plan.activeDays} active days · {plan.completedExercises} exercises completed</span>
                    <span className="mt-1 block text-gray-500">Last activity: {plan.lastCompletedAt ? formatAppDateTime(plan.lastCompletedAt) : plan.lastCompletedOn ? formatAppDate(plan.lastCompletedOn) : 'None recorded'}</span>
                    {plan.recentDays.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{plan.recentDays.slice(0, 10).map(day => <span key={day.date} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-600">{formatAppDate(day.date)}: {day.completedExercises}</span>)}</div>}
                  </div>)}
                </div>
              ) : <p className="text-gray-500">No program has been assigned.</p>}
            </section>
            {selectedAssessments.length > 0 && <section>
              <h3 className="mb-2 font-bold uppercase">Past assessments</h3>
              {selectedAssessments.map(entry => <div key={entry.id} className="border-t border-gray-100 py-2">
                <strong>{formatAppDate(entry.date)}</strong> · {entry.weightKg} kg · {entry.bodyFatPercentage}% body fat
                {entry.trainerNotes && <p className="mt-1 whitespace-pre-wrap text-gray-600">{entry.trainerNotes}</p>}
              </div>)}
            </section>}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
};
