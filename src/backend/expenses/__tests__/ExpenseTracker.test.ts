import { ExpenseTracker } from '../ExpenseTracker';

async function runTests() {
  console.log('--- Starting ExpenseTracker Acceptance Tests ---');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string) {
    total++;
    if (condition) {
      console.log(`✅ [PASS] ${name}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${name}`);
      throw new Error(`Test failed: ${name}`);
    }
  }

  const tracker = new ExpenseTracker();

  // 1-4. Specific Test from User Brief:
  // Input: 31 tokens
  // Output: 31 tokens
  // Cached input: 0 tokens
  // Input rate: ৳14.45 per million
  // Output rate: ৳28.875 per million
  // Expected total cost: ৳0.001343075
  const test1 = tracker.calculateCost('deepseek-v4-flash-0731', 31, 31, 0);
  assert(Math.abs(test1.standardInputCost - 0.00044795) < 1e-10, '1. Correct input-cost calculation (0.00044795 BDT)');
  assert(Math.abs(test1.outputCost - 0.000895125) < 1e-10, '2. Correct output-cost calculation (0.000895125 BDT)');
  assert(test1.cachedInputCost === 0, '3. Correct cached-token cost calculation with 0 cached tokens');
  assert(Math.abs(test1.totalCost - 0.001343075) < 1e-10, '4. Correct total-cost calculation matches exact brief (৳0.001343075)');

  // 3b. Cached token calculation without double counting:
  // e.g. prompt: 100, cached: 40 (standard: 60), output: 50
  // Standard in: 60 * 14.45 / 1,000,000 = 0.000867
  // Cached in: 40 * 0.50 / 1,000,000 = 0.000020
  // Output: 50 * 28.875 / 1,000,000 = 0.00144375
  // Total: 0.000867 + 0.000020 + 0.00144375 = 0.00233075
  const testCached = tracker.calculateCost('deepseek-v4-flash-0731', 100, 50, 40);
  assert(testCached.standardInputTokens === 60, '3b. Standard input tokens correctly subtracts cached tokens');
  assert(testCached.cachedInputTokens === 40, '3c. Cached tokens accurately registered');
  assert(Math.abs(testCached.totalCost - 0.00233075) < 1e-10, '3d. Cached calculation avoids double-counting');

  // 5. Requests with zero tokens
  const testZero = tracker.calculateCost('deepseek-v4-flash-0731', 0, 0, 0);
  assert(testZero.totalCost === 0, '5. Requests with zero tokens yield 0 cost');

  // 6. Requests with missing usage data
  const recMissing = await tracker.recordRequest({
    requestId: 'req_test_missing_usage',
    model: 'deepseek-v4-flash-0731',
    status: 'success',
    httpStatus: 200,
    latencyMs: 150,
    usage: null // usage unavailable
  });
  assert(recMissing.usage_available === false, '6a. Missing usage data marked as usage_available: false');
  assert(recMissing.total_cost === null, '6b. Missing usage data does not invent token count or cost');

  // 7. Failed requests
  const recFailed = await tracker.recordRequest({
    requestId: 'req_test_failed',
    model: 'deepseek-v4-flash-0731',
    status: 'failure',
    httpStatus: 500,
    latencyMs: 250,
    usage: null,
    errorCode: 'HTTP_500',
    errorMessage: 'Internal Server Error'
  });
  assert(recFailed.status === 'failure', '7a. Failed request tracked with failure status');
  assert(recFailed.http_status === 500, '7b. Failed request tracks HTTP 500');

  // 8. Requests using different model and different pricing
  await tracker.addOrUpdateModel({
    model: 'custom-progga-deepseek-coder',
    displayName: 'DeepSeek Coder Pro',
    inputPricePerMillion: 20.0,
    outputPricePerMillion: 40.0,
    cachedInputPricePerMillion: 1.0,
    enabled: true
  }, 'TestRunner');
  const testCustomModel = tracker.calculateCost('custom-progga-deepseek-coder', 1000, 1000, 0);
  assert(Math.abs(testCustomModel.totalCost - 0.060) < 1e-10, '8. Different model uses its own configured pricing');

  // 9. Historical pricing snapshots
  const recSnapshot = await tracker.recordRequest({
    requestId: 'req_test_snapshot',
    model: 'deepseek-v4-flash-0731',
    status: 'success',
    httpStatus: 200,
    latencyMs: 300,
    usage: { prompt_tokens: 31, completion_tokens: 31, total_tokens: 62 }
  });
  assert(recSnapshot.pricing_snapshot !== null, '9a. Request captures pricing snapshot');
  assert(recSnapshot.pricing_snapshot?.inputPricePerMillion === 14.45, '9b. Snapshot preserves exact input rate at call time');

  // 10. Duplicate request prevention
  const recDup = await tracker.recordRequest({
    requestId: 'req_test_snapshot', // Same ID
    model: 'deepseek-v4-flash-0731',
    status: 'success',
    httpStatus: 200,
    latencyMs: 300,
    usage: { prompt_tokens: 500, completion_tokens: 500 }
  });
  assert(recDup.prompt_tokens === 31, '10. Duplicate request ID is ignored for accounting (preserves original)');

  // 11. Date filtering and dashboard aggregation
  const overview = tracker.getOverviewMetrics({ preset: 'all' });
  assert(overview.totalRequests >= 3, '11a. Overview aggregates total requests');
  assert(overview.currency === 'BDT', '11b. Overview currency is BDT (৳)');

  // 12. CSV and JSON exports
  const exportCsv = tracker.exportData('csv', {});
  const exportJson = tracker.exportData('json', {});
  assert(exportCsv.data.includes('Timestamp,Request ID,Provider,Model'), '12a. CSV export includes standard accounting headers');
  assert(exportJson.data.startsWith('['), '12b. JSON export returns structured records array');

  // 13. API-key secrecy in exports and records
  assert(!exportCsv.data.includes('PROGGA_KEY') && !exportCsv.data.includes('Bearer '), '13a. CSV export does not leak authorization keys');
  assert(!exportJson.data.includes('PROGGA_KEY') && !exportJson.data.includes('Bearer '), '13b. JSON export does not leak authorization keys');

  // 14. Pre-Tracking Historical Expense Baseline (BDT 0.93375)
  const baseline = await tracker.ensurePreTrackingBaseline();
  assert(Math.abs(baseline.total_cost! - 0.93375) < 1e-10, '14a. Baseline expense is exactly ৳0.93375 BDT');
  assert(baseline.metadata?.is_pre_tracking_baseline === true, '14b. Baseline record is flagged as is_pre_tracking_baseline');
  const overviewWithBaseline = tracker.getOverviewMetrics({ preset: 'all' });
  assert(overviewWithBaseline.preTrackingBaselineExpenses === 0.93375, '14c. Overview includes ৳0.93375 baseline expense');

  console.log(`\n🎉 All ${passed}/${total} Acceptance Criteria Unit Tests Passed!`);
  process.exit(0);
}

runTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
