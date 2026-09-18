import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { Target } from 'lucide-react';

/**
 * AttainmentPage — placeholder for the CO Attainment module.
 * Will be connected to the backend when attainment calculation is implemented.
 */
export default function AttainmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="CO Attainment"
        description="View Course Outcome attainment analysis."
      />
      <Card>
        <EmptyState
          icon={Target}
          title="No attainment data"
          message="CO attainment analysis will be available here once Course Outcomes are defined, assessments are created, and student marks are entered."
        />
      </Card>
    </div>
  );
}
