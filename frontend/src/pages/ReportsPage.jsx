import PageHeader from '../components/common/PageHeader';
import Card from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import { FileBarChart } from 'lucide-react';

/**
 * ReportsPage — placeholder for the Reports module.
 * Will be connected to the backend when report generation is implemented.
 */
export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and download OBE reports."
      />
      <Card>
        <EmptyState
          icon={FileBarChart}
          title="No reports available"
          message="OBE reports will be generated here once courses, assessments, and attainment data are available. Report types will include CO attainment, PO attainment, and course-level analysis."
        />
      </Card>
    </div>
  );
}
