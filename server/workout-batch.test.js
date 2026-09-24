import test from 'node:test';
import assert from 'node:assert/strict';
import { assertWorkoutBatchEligibility, uniqueWorkoutMemberIds } from './routes.js';
import { workoutCreatePayload } from '../shared/workout-create.js';

test('trainer workout request contains only API-supported fields',()=>{
 const payload=workoutCreatePayload({title:'Strength Plan',description:'Member program',difficulty:'Intermediate',daysPerWeek:4,memberIds:['member-a'],trainerId:'client-id',trainerName:'Client name'},[]);
 assert.deepEqual(Object.keys(payload).sort(),['daysPerWeek','description','difficulty','memberIds','routine','title'].sort());
 assert.equal(payload.daysPerWeek,4);
 assert.deepEqual(payload.memberIds,['member-a']);
});

test('workout batch selection removes duplicate member ids',()=>{
 const ids=uniqueWorkoutMemberIds({memberIds:['member-a','member-b','member-a']});
 assert.deepEqual(ids,['member-a','member-b']);
});

test('workout batch eligibility rejects the complete operation when any member is ineligible',()=>{
 assert.throws(()=>assertWorkoutBatchEligibility([{member_id:'member-a'}],['member-a','member-b']),error=>error.code==='WORKOUT_ACCESS_REQUIRED'&&error.status===403);
 assert.doesNotThrow(()=>assertWorkoutBatchEligibility([{member_id:'member-a'},{member_id:'member-b'}],['member-a','member-b']));
});
