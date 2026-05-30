import { Injectable, NotFoundException } from '@nestjs/common';

type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Interested'
  | 'Follow-up Pending'
  | 'Converted';

type Lead = {
  id: number;
  name: string;
  college: string;
  source: string;
  status: LeadStatus;
  assignedTo: string;
  followUpDate: string;
  notes: string;
};

@Injectable()
export class OutreachService {
  private leads: Lead[] = [
    {
      id: 1,
      name: 'Aarav Sharma',
      college: 'Malla Reddy University',
      source: 'Instagram',
      status: 'Interested',
      assignedTo: 'Outreach Intern',
      followUpDate: '2026-05-30',
      notes: 'Interested in placement roadmap',
    },
    {
      id: 2,
      name: 'Sneha Reddy',
      college: 'CMR Engineering College',
      source: 'WhatsApp',
      status: 'Contacted',
      assignedTo: 'Outreach Intern',
      followUpDate: '2026-05-29',
      notes: 'Asked for senior mentor details',
    },
  ];

  findAll() {
    return this.leads;
  }

  create(body: Partial<Lead>) {
    const newLead: Lead = {
      id: Date.now(),
      name: body.name || '',
      college: body.college || '',
      source: body.source || 'Instagram',
      status: body.status || 'New',
      assignedTo: body.assignedTo || 'Not assigned',
      followUpDate: body.followUpDate || 'Not set',
      notes: body.notes || 'No notes added',
    };

    this.leads.unshift(newLead);
    return newLead;
  }

  update(id: number, body: Partial<Lead>) {
    const leadIndex = this.leads.findIndex((lead) => lead.id === id);

    if (leadIndex === -1) {
      throw new NotFoundException('Lead not found');
    }

    this.leads[leadIndex] = {
      ...this.leads[leadIndex],
      ...body,
    };

    return this.leads[leadIndex];
  }

  remove(id: number) {
    const lead = this.leads.find((item) => item.id === id);

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    this.leads = this.leads.filter((item) => item.id !== id);

    return {
      message: 'Lead deleted successfully',
      deletedLead: lead,
    };
  }
}