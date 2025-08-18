import { supabase } from '@/integrations/supabase/client';

export interface Commercial {
  id: string;
  name: string;
}

export interface Lead {
  id: string;
  commercial_id: string | null;
}

export const validateLeadDistribution = async () => {
  try {
    // Get lead distribution stats
    const { data: distributionStats, error: statsError } = await supabase
      .from('marketing_contacts')
      .select(`
        commercial_id,
        commercials (
          id,
          name
        )
      `);

    if (statsError) throw statsError;

    // Count leads per commercial
    const distribution: Record<string, { name: string; count: number }> = {};
    let unassignedCount = 0;

    distributionStats?.forEach(lead => {
      if (lead.commercial_id && lead.commercials) {
        const commercialId = lead.commercial_id;
        const commercialName = lead.commercials.name;
        
        if (!distribution[commercialId]) {
          distribution[commercialId] = { name: commercialName, count: 0 };
        }
        distribution[commercialId].count++;
      } else {
        unassignedCount++;
      }
    });

    // Get total leads and commercials count
    const { data: totalLeads } = await supabase
      .from('marketing_contacts')
      .select('id', { count: 'exact' });

    const { data: commercials } = await supabase
      .from('commercials')
      .select('id, name');

    const totalCount = totalLeads?.length || 0;
    const commercialsCount = commercials?.length || 0;
    const idealLeadsPerCommercial = Math.floor(totalCount / commercialsCount);

    return {
      totalLeads: totalCount,
      unassignedLeads: unassignedCount,
      assignedLeads: totalCount - unassignedCount,
      commercials: commercialsCount,
      idealLeadsPerCommercial,
      distribution: Object.entries(distribution).map(([id, data]) => ({
        id,
        name: data.name,
        count: data.count,
        variance: data.count - idealLeadsPerCommercial
      })),
      isBalanced: Object.values(distribution).every(d => 
        Math.abs(d.count - idealLeadsPerCommercial) <= 1
      )
    };
  } catch (error) {
    console.error('Error validating lead distribution:', error);
    throw error;
  }
};

export const redistributeAllLeads = async () => {
  try {
    console.log('Starting lead redistribution...');

    // Get all commercials with consistent ordering
    const { data: commercials, error: commercialsError } = await supabase
      .from('commercials')
      .select('id, name')
      .order('name'); 

    if (commercialsError) {
      console.error('Error fetching commercials:', commercialsError);
      throw commercialsError;
    }

    if (!commercials || commercials.length === 0) {
      throw new Error('Aucun commercial trouvé');
    }

    console.log(`Found ${commercials.length} commercials:`, commercials.map(c => c.name));

    // Get all leads with consistent ordering
    const { data: allLeads, error: leadsError } = await supabase
      .from('marketing_contacts')
      .select('id')
      .order('created_at', { ascending: true });

    if (leadsError) {
      console.error('Error fetching leads:', leadsError);
      throw leadsError;
    }

    if (!allLeads || allLeads.length === 0) {
      throw new Error('Aucun lead trouvé');
    }

    console.log(`Found ${allLeads.length} total leads`);

    // Step 1: Reset ALL leads to unassigned to ensure clean slate
    console.log('Resetting all leads to unassigned...');
    const { error: resetError } = await supabase
      .from('marketing_contacts')
      .update({ commercial_id: null })
      .neq('id', '00000000-0000-0000-0000-000000000000'); // This ensures we update all real records

    if (resetError) {
      console.error('Error resetting leads:', resetError);
      throw resetError;
    }

    // Verify reset worked
    const { data: unassignedCheck } = await supabase
      .from('marketing_contacts')
      .select('id', { count: 'exact' })
      .is('commercial_id', null);

    console.log(`Reset verification: ${unassignedCheck?.length || 0} leads are now unassigned`);

    // Step 2: Calculate exact distribution
    const totalLeads = allLeads.length;
    const totalCommercials = commercials.length;
    const baseLeadsPerCommercial = Math.floor(totalLeads / totalCommercials);
    const remainder = totalLeads % totalCommercials;

    console.log(`Distribution plan:`);
    console.log(`- Total leads: ${totalLeads}`);
    console.log(`- Total commercials: ${totalCommercials}`);
    console.log(`- Base leads per commercial: ${baseLeadsPerCommercial}`);
    console.log(`- Extra leads to distribute: ${remainder}`);

    // Step 3: Assign leads in exact batches
    let currentIndex = 0;
    const assignmentResults = [];

    for (let i = 0; i < commercials.length; i++) {
      const commercial = commercials[i];
      // First ${remainder} commercials get one extra lead
      const leadsForThisCommercial = baseLeadsPerCommercial + (i < remainder ? 1 : 0);
      
      if (leadsForThisCommercial === 0) {
        console.log(`Commercial ${commercial.name}: 0 leads (no leads to assign)`);
        continue;
      }

      // Get the exact slice of leads for this commercial
      const leadsToAssign = allLeads.slice(currentIndex, currentIndex + leadsForThisCommercial);
      const leadIds = leadsToAssign.map(lead => lead.id);

      console.log(`Assigning leads ${currentIndex + 1}-${currentIndex + leadsForThisCommercial} to ${commercial.name} (${leadIds.length} leads)`);

      // Assign this batch to the commercial
      const { data: updateResult, error: updateError } = await supabase
        .from('marketing_contacts')
        .update({ commercial_id: commercial.id })
        .in('id', leadIds)
        .select('id');

      if (updateError) {
        console.error(`Error assigning leads to ${commercial.name}:`, updateError);
        throw updateError;
      }

      const actualAssigned = updateResult?.length || 0;
      assignmentResults.push({
        commercial: commercial.name,
        expected: leadsForThisCommercial,
        actual: actualAssigned,
        leadIds: leadIds.length
      });

      console.log(`✓ Successfully assigned ${actualAssigned} leads to ${commercial.name}`);
      currentIndex += leadsForThisCommercial;
    }

    // Step 4: Verify final distribution
    console.log('Verifying final distribution...');
    const { data: verificationData } = await supabase
      .from('marketing_contacts')
      .select(`
        commercial_id,
        commercials!inner(name)
      `);

    const finalDistribution: Record<string, { name: string; count: number }> = {};
    let finalUnassigned = 0;

    verificationData?.forEach(lead => {
      if (lead.commercial_id && lead.commercials) {
        const commercialId = lead.commercial_id;
        const commercialName = lead.commercials.name;
        
        if (!finalDistribution[commercialId]) {
          finalDistribution[commercialId] = { name: commercialName, count: 0 };
        }
        finalDistribution[commercialId].count++;
      } else {
        finalUnassigned++;
      }
    });

    const distributionSummary = Object.values(finalDistribution).map(d => 
      `${d.name}: ${d.count} leads`
    ).join(', ');

    console.log('Final distribution:', distributionSummary);
    console.log(`Unassigned leads: ${finalUnassigned}`);

    // Check if distribution is balanced (difference of max 1 lead between any two commercials)
    const counts = Object.values(finalDistribution).map(d => d.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);
    const isBalanced = (maxCount - minCount) <= 1;

    const validation = await validateLeadDistribution();

    return {
      success: true,
      message: `${totalLeads} leads redistribués équitablement parmi ${totalCommercials} commerciaux`,
      distribution: validation.distribution,
      isBalanced,
      summary: {
        totalLeads,
        totalCommercials,
        baseLeadsPerCommercial,
        remainder,
        finalUnassigned,
        assignmentResults
      }
    };

  } catch (error) {
    console.error('Error redistributing leads:', error);
    throw error;
  }
};