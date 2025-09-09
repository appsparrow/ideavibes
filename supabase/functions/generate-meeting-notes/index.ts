import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { meetingId } = await req.json();

    if (!meetingId) {
      return new Response(
        JSON.stringify({ error: 'Meeting ID is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get meeting notes
    const { data: notes, error: notesError } = await supabase
      .from('meeting_notes')
      .select(`
        content,
        created_at,
        profiles:user_id (
          first_name,
          last_name,
          name
        )
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (notesError) {
      console.error('Error fetching notes:', notesError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch meeting notes' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (!notes || notes.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No meeting notes found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Format notes for AI processing
    const formattedNotes = notes.map(note => {
      const authorName = note.profiles?.first_name && note.profiles?.last_name 
        ? `${note.profiles.first_name} ${note.profiles.last_name}`
        : note.profiles?.name || 'Unknown User';
      
      return `[${authorName}]: ${note.content}`;
    }).join('\n\n');

    console.log('Formatted notes for AI:', formattedNotes);

    // Try Gemini API first, then DeepSeek if Gemini fails
    let aiSummary = '';
    
    // Try Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (geminiApiKey) {
      try {
        const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Please analyze the following meeting notes and create a comprehensive summary including:

1. Key Discussion Points
2. Important Decisions Made
3. Action Items (if any)
4. Next Steps
5. Overall Meeting Summary

Meeting Notes:
${formattedNotes}

Please format the response in a clear, structured manner.`
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 1024,
            }
          })
        });

        if (geminiResponse.ok) {
          const geminiData = await geminiResponse.json();
          aiSummary = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          console.log('Generated summary with Gemini:', aiSummary);
        }
      } catch (error) {
        console.error('Gemini API error:', error);
      }
    }

    // Try DeepSeek API if Gemini failed
    if (!aiSummary) {
      const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
      if (deepseekApiKey) {
        try {
          const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${deepseekApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: [
                {
                  role: 'system',
                  content: 'You are an AI assistant that creates comprehensive meeting summaries. Please analyze meeting notes and provide structured summaries.'
                },
                {
                  role: 'user',
                  content: `Please analyze the following meeting notes and create a comprehensive summary including:

1. Key Discussion Points
2. Important Decisions Made
3. Action Items (if any)
4. Next Steps
5. Overall Meeting Summary

Meeting Notes:
${formattedNotes}

Please format the response in a clear, structured manner.`
                }
              ],
              temperature: 0.7,
              max_tokens: 1024
            })
          });

          if (deepseekResponse.ok) {
            const deepseekData = await deepseekResponse.json();
            aiSummary = deepseekData.choices?.[0]?.message?.content || '';
            console.log('Generated summary with DeepSeek:', aiSummary);
          }
        } catch (error) {
          console.error('DeepSeek API error:', error);
        }
      }
    }

    if (!aiSummary) {
      return new Response(
        JSON.stringify({ error: 'Failed to generate AI summary. Please ensure API keys are configured.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Update meeting with AI-generated notes
    const { error: updateError } = await supabase
      .from('meetings')
      .update({ 
        notes: aiSummary,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId);

    if (updateError) {
      console.error('Error updating meeting:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save AI summary' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    return new Response(
      JSON.stringify({ 
        summary: aiSummary,
        message: 'AI summary generated successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-meeting-notes function:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});